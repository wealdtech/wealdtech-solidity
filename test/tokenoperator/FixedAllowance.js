'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const FixedAllowance = artifacts.require('FixedAllowance');

contract('FixedAllowance', accounts => {
    var erc777Instance;
    var operator;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].add(initialSupply);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // accounts[1] is our test source address so send it some tokens
        const amount = granularity.mul(web3.utils.toBN('100'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the operator contract', async function() {
        operator = await FixedAllowance.new({
            from: accounts[0]
        });
    });

    it('does not send when not set up', async function() {
        const amount = granularity.mul(web3.utils.toBN('5'));

        await operator.setAllowance(erc777Instance.address, accounts[3], 0, granularity.mul(web3.utils.toBN('100')), {
            from: accounts[1]
        });

        // Attempt to transfer tokens as accounts[3] from accounts[1] to accounts[2]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'not allowed to send');

        await operator.setAllowance(erc777Instance.address, accounts[3], granularity.mul(web3.utils.toBN('100')), 0, {
            from: accounts[1]
        });
    });

    it('does not transfer without an allowance', async function() {
        // Set up the contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), true);

        const amount = granularity.mul(web3.utils.toBN('5'));
        // Attempt to transfer tokens as accounts[3] from accounts[1] to accounts[3]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'amount exceeds allowance');
    });

    it('transfers when set up', async function() {
        // Set up an allowance for accounts[3] to withdraw from accounts[1]
        await operator.setAllowance(erc777Instance.address, accounts[3], 0, granularity.mul(web3.utils.toBN('100')), {
            from: accounts[1]
        });

        // Transfer tokens as accounts[3] from accounts[1] to accounts[2]
        const amount = granularity.mul(web3.utils.toBN('5'));
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not transfer more than allowed', async function() {
        const amount = granularity.mul(web3.utils.toBN('100'));
        // Attempt to transfer tokens as accounts[3] from accounts[1] to accounts[2]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'amount exceeds allowance');
    });

    it('does not work when de-registered', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);

        const amount = granularity.mul(web3.utils.toBN('5'));
        // Attempt to transfer tokens - should fail as deregistered
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, {
                    from: accounts[3]
                }), 'not allowed to send');
    });
});
