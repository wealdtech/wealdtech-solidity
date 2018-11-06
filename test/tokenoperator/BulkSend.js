'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const BulkSend = artifacts.require('BulkSend');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('BulkSend', accounts => {
    var erc777Instance;
    var operator;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);
    tokenBalances[accounts[3]] = web3.toBigNumber(0);

    it('sets up', async function() {
        operator = await BulkSend.new({
            from: accounts[0]
        });

        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [operator.address], 0, {
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

    it('bulk transfers same amount', async function() {
        const amount = granularity.mul(5);

        // Send the same amount to multiple accounts
        await operator.send(erc777Instance.address, [accounts[2], accounts[3]], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount.mul(2));
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('bulk transfers different amounts', async function() {
        const amount2 = granularity.mul(8);
        const amount3 = granularity.mul(12);

        // Send the same amount to multiple accounts
        await operator.sendAmounts(erc777Instance.address, [accounts[2], accounts[3]], [amount2, amount3], '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount2).sub(amount3);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount2);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(amount3);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });
});
