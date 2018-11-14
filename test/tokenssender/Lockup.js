'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const Lockup = artifacts.require('Lockup');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;
const currentOffset = () => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0 })
const increaseTime = addSeconds => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [addSeconds], id: 0 })
const mine = () => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

contract('Lockup', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x820b586C8C28125366C998641B09DCbE7d4cBF06');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].add(initialSupply);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // accounts[1] is our test source address so send it some tokens
        const amount = granularity.mul(100);
        await erc777Instance.send(accounts[1], amount, '', {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the sender contract', async function() {
        instance = await Lockup.new({
            from: accounts[0]
        });

        // Expiry is set to 1 day after the current time
        const now = Math.round(new Date().getTime() / 1000) + currentOffset().result;
        const expiry = now + 86400;
        await instance.setExpiry(erc777Instance.address, expiry, {
            from: accounts[1]
        });
    });

    it('sets up the operator', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Make accounts[3] an operator for accounts[1]
        await erc777Instance.authorizeOperator(accounts[3], {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[3], accounts[1]), true);
    });

    it('does not transfer before the lockup expires', async function() {
        const amount = granularity.mul(10);
        await truffleAssert.reverts(
                erc777Instance.send(accounts[2], amount, '', {
                    from: accounts[1]
                }), 'lockup has not expired');
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', '', {
                    from: accounts[3]
                }), 'lockup has not expired');
    });

    it('transfers after the lockup expires', async function() {
        // Go past expiry
        increaseTime(86401);
        mine();

        const amount = granularity.mul(10);
        await erc777Instance.send(accounts[2], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        await erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not transfer more than the allowance', async function() {
        const amount = granularity.mul(105);
        await truffleAssert.reverts(
                erc777Instance.send(accounts[2], amount, '', {
                    from: accounts[1]
                }), 'not enough tokens in holder\'s account');
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', '', {
                    from: accounts[3]
                }), 'not enough tokens in holder\'s account');
    });

    it('de-registers', async function() {
        await erc777Instance.revokeOperator(accounts[3], {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[3], accounts[1]), false);
    });
});
