'use strict';

const asserts = require('../helpers/asserts.js');
const erc1820 = require('../helpers/erc1820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const AllowSpecifiedRecipients = artifacts.require('AllowSpecifiedRecipients');

contract('AllowSpecifiedRecipients', accounts => {
    var erc777Instance;
    var erc1820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

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
        const amount = granularity.mul(web3.utils.toBN('100'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the sender contract', async function() {
        instance = await AllowSpecifiedRecipients.new({
            from: accounts[0]
        });
    });

    it('handles recipients accordingly', async function() {
        // Register the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Attempt to tranfer tokens to accounts[2] - should fail
        const amount = granularity.mul(web3.utils.toBN('5'));
        await truffleAssert.reverts(
                erc777Instance.send(accounts[2], amount, [], {
                    from: accounts[1]
                }), 'not allowed to send to that recipient');

        // Set up a recipient for accounts[2]
        await instance.setRecipient(accounts[2], {
            from: accounts[1]
        });
        assert.equal(await instance.getRecipient(accounts[1], accounts[2]), true);

        // Transfer tokens to accounts[2]
        await erc777Instance.send(accounts[2], amount, [], {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Attempt to tranfer tokens to accounts[3] - should fail
        await truffleAssert.reverts(
                erc777Instance.send(accounts[3], amount, [], {
                    from: accounts[1]
                }), 'not allowed to send to that recipient');

        // Clear recipient for accounts[2]
        await instance.clearRecipient(accounts[2], {
            from: accounts[1]
        });
        assert.equal(await instance.getRecipient(accounts[1], accounts[2]), false);

        // Attempt to tranfer tokens to accounts[2] - should fail
        await truffleAssert.reverts(
                erc777Instance.send(accounts[2], amount, [], {
                    from: accounts[1]
                }), 'not allowed to send to that recipient');

        // Unregister the sender
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });
});
