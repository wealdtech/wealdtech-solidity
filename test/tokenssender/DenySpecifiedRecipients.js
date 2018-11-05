'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const DenySpecifiedRecipients = artifacts.require('DenySpecifiedRecipients');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('DenySpecifiedRecipients', accounts => {
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
        const amount = granularity.mul(100);
        await erc777Instance.send(accounts[1], granularity.mul(100), '', {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the sender contract', async function() {
        instance = await DenySpecifiedRecipients.new({
            from: accounts[0]
        });
    });

    it('handles recipients accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Transfer tokens to accounts[2]
        const amount = granularity.mul(5);
        await erc777Instance.send(accounts[2], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Set up a recipient for accounts[2]
        await instance.setRecipient(accounts[2], {
            from: accounts[1]
        });
        assert.equal(await instance.getRecipient(accounts[1], accounts[2]), true);

        // Attempt to tranfer tokens to accounts[2] - should fail
        await truffleAssert.reverts(
                erc777Instance.send(accounts[2], amount, '', {
                    from: accounts[1]
                }), 'transfers to that recipient are blocked');

        // Transfer tokens to accounts[3]
        await erc777Instance.send(accounts[3], granularity.mul(5), '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[3]] = tokenBalances[accounts[3]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
        
        // Clear recipient for accounts[2]
        await instance.clearRecipient(accounts[2], {
            from: accounts[1]
        });
        assert.equal(await instance.getRecipient(accounts[1], accounts[2]), false);

        // Transfer tokens to accounts[2]
        await erc777Instance.send(accounts[2], amount, '', {
            from: accounts[1]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });
});
