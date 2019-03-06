'use strict';

const asserts = require('../helpers/asserts.js');
const erc1820 = require('../helpers/erc1820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const SupplementWitholdingAccount = artifacts.require('SupplementWitholdingAccount');

contract('SupplementWitholdingAccount', accounts => {
    var erc777Instance;
    var erc1820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);
    tokenBalances[accounts[3]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc1820Instance = await erc1820.instance();
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
        const amount = granularity.mul(web3.utils.toBN('200'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the sender contract', async function() {
        instance = await SupplementWitholdingAccount.new({
            from: accounts[0]
        });
    });

    it('supplements tokens accordingly', async function() {
        // Register the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Set up 15% witholding from accounts[1] to accounts[3]
        await instance.setSupplement(accounts[3], 1500, {
			from: accounts[1]
		});

        // Set up the sender contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[1] to accounts[2]
        const amount = granularity.mul(web3.utils.toBN('100'));
        await erc777Instance.send(accounts[2], amount, [], {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        const witholdingAmount =granularity.mul(web3.utils.toBN('15'));
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(witholdingAmount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(witholdingAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[1]
        });

        // Unregister the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });

    it('supplements odd-granularity values accordingly', async function() {
        // Register the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Set up 15% witholding from accounts[1] to accounts[3]
        await instance.setSupplement(accounts[3], 1500, {
			from: accounts[1]
		});

        // Set up the sender contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[1]
        });

        // Transfer 10*granularity tokens from accounts[1] to accounts[2]
        const amount = granularity.mul(web3.utils.toBN('10'));
        await erc777Instance.send(accounts[2], amount, [], {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        // Witholding should round up the 1.5 to 2 for granularity...
        const witholdingAmount =granularity.mul(web3.utils.toBN('2'));
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(witholdingAmount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(witholdingAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[1]
        });

        // Unregister the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });
});
