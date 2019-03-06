'use strict';

const asserts = require('../helpers/asserts.js');
const erc1820 = require('../helpers/erc1820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const DenyLowAmount = artifacts.require('DenyLowAmount');

contract('DenyLowAmount', accounts => {
    var erc777Instance;
    var erc1820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc1820Instance = await erc1820.instance();
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = initialSupply.clone();
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the recipient contract', async function() {
        instance = await DenyLowAmount.new({
            from: accounts[0]
        });
    });

    it('denies low-amount transfers accordingly', async function() {
        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        const amount = granularity.mul(web3.utils.toBN('100'));
        const lowAmount = granularity.mul(web3.utils.toBN('5'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Register the recipient
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), instance.address, {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Deny transfers less than 10*granularity from token
        await instance.setMinimumAmount(erc777Instance.address, granularity.mul(web3.utils.toBN('10')), {
            from: accounts[1]
        });

        // Attempt to transfer granularity*5 tokens to accounts[1] - should fail
        truffleAssert.reverts(
            erc777Instance.send(accounts[1], lowAmount, [], {
                from: accounts[0]
            }), 'transfer value too low to be accepted');

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Clear limit
        await instance.clearMinimumAmount(erc777Instance.address, {
            from: accounts[1]
        });

        // Transfer 5*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], lowAmount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(lowAmount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(lowAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the recipient
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });
});
