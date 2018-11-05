'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const SupplementWitholdingAccount = artifacts.require('SupplementWitholdingAccount');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('SupplementWitholdingAccount', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);
    tokenBalances[accounts[3]] = web3.toBigNumber(0);

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x820A8Cfd018b159837d50656c49d28983f18f33c');
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
        const amount = granularity.mul(200);
        await erc777Instance.send(accounts[1], amount, '', {
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
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
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
        const amount = granularity.mul(100);
        await erc777Instance.send(accounts[2], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        const witholdingAmount =granularity.mul(15);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(witholdingAmount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(witholdingAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[1]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });

    it('supplements odd-granularity values accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
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
        const amount = granularity.mul(10);
        await erc777Instance.send(accounts[2], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        // Witholding should round up the 1.5 to 2 for granularity...
        const witholdingAmount =granularity.mul(2);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(witholdingAmount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(witholdingAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[1]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });
});
