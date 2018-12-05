'use strict';

const asserts = require('../helpers/asserts.js');
const erc820 = require('../helpers/erc820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const Forwarder = artifacts.require('Forwarder');

contract('Forwarder', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc820Instance = await erc820.instance();
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
        instance = await Forwarder.new({
            from: accounts[0]
        });
    });

    it('forwards tokens accordingly', async function() {
        // Register the recipient
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), instance.address, {
            from: accounts[1]
        });

        // Set up forwarding from accounts[1] to accounts[2]
        await instance.setForwarder(accounts[2], {
            from: accounts[1]
        });
        assert.equal(await instance.getForwarder(accounts[1]), accounts[2]);

        // Set up the recipient contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[1]
        });

        // Transfer tokens from accounts[0] to accounts[1]
        const amount = granularity.mul(web3.utils.toBN('10'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[0]
        });

        // Unregister the recipient
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });
});
