'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const FixedTimeLockup = artifacts.require('FixedTimeLockup');

const currentOffset = () => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0 })
const increaseTime = addSeconds => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [addSeconds], id: 0 })
const mine = () => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

contract('FixedTimeLockup', accounts => {
    var erc777Instance;
    var operator;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);

    it('sets up', async function() {
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

    it('creates the operator contract', async function() {
        operator = await FixedTimeLockup.new({
            from: accounts[0]
        });
    });

    it('does not send when not set up', async function() {
        const amount = granularity.mul(5);

        // Attempt to transfer tokens as accounts[3] from accounts[1] to accounts[2]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'no release time set');
    });

    it('does not transfer before the release date', async function() {
        // Set up the contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(operator.address, {
            from: accounts[1]
        });

        const now = Math.round(new Date().getTime() / 1000) + currentOffset().result;
        const expiry = now + 60;
        // Allow eeryone to empty the account after expiry
        await operator.setReleaseTimestamp(erc777Instance.address, expiry, {
            from: accounts[1]
        });

        const amount = granularity.mul(5);
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'not yet released');
    });

    it('does not transfer without an allowance', async function() {
        // Expiry is 1 minute so go past that
        increaseTime(61);
        mine();

        // But we don't have an allowance so expect this to fail
        const amount = granularity.mul(5);
        // Attempt to transfer tokens as accounts[3] from accounts[1] to accounts[2]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'amount exceeds allowance');
    });

    it('transfers after the release date and within the allowance', async function() {
        // Set the allowance
        await operator.setAllowance(erc777Instance.address, accounts[3], 0, granularity.mul(100), {
            from: accounts[1]
        });

        const amount = granularity.mul(5);
        // Transfer tokens as accounts[3] from accounts[1] to accounts[2]
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not work when de-registered', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);

        const amount = granularity.mul(5);
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'not allowed to send');
    });
});
