'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const EmitMessage = artifacts.require('EmitMessage');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('EmitMessage', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const initialSupply = web3.toBigNumber('1000000000000000000000');
    const granularity = web3.toBigNumber('10000000000000000');

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x991a1bcb077599290d7305493c9a630c20f8b798');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
    });

    it('creates the sender contract', async function() {
        instance = await EmitMessage.new({
            from: accounts[0]
        });
    });

    it('generates messages accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[0]
        });

        // Transfer tokens to accounts[1]
        var tx = await erc777Instance.send(accounts[1], granularity.mul(5), "", {
            from: accounts[0]
        });
        
        // Set up a message for accounts[0] -> accounts[1]
        await instance.setMessage(accounts[1], "Transfer to account 1", {
            from: accounts[0]
        });
        assert.equal(await instance.getMessage(accounts[0], accounts[1]), "Transfer to account 1");

        // Transfer tokens to accounts[1]
        var tx = await erc777Instance.send(accounts[1], granularity.mul(5), "", {
            from: accounts[0]
        });
        // Ensure the message is present
        assert.equal(2, tx.receipt.logs.length);
        var found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
            if (tx.receipt.logs[i].topics[0] == web3.sha3("Message(address,address,string)") &&
                tx.receipt.logs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742031') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Set up a message for accounts[0]
        await instance.setMessage(0, "Transfer from account 0", {
            from: accounts[0]
        });
        assert.equal(await instance.getMessage(accounts[0], 0), "Transfer from account 0");

        // Transfer tokens to accounts[1]
        var tx = await erc777Instance.send(accounts[1], granularity.mul(5), "", {
            from: accounts[0]
        });

        // Ensure the specific message is present
        assert.equal(2, tx.receipt.logs.length);
        found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
            if (tx.receipt.logs[i].topics[0] == web3.sha3("Message(address,address,string)") &&
                tx.receipt.logs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742031') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(5), "", {
            from: accounts[0]
        });

        // Ensure the general message is present
        assert.equal(2, tx.receipt.logs.length);
        found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
           if (tx.receipt.logs[i].topics[0] == web3.sha3("Message(address,address,string)") &&
               tx.receipt.logs[i].data.slice(258,304) == '5472616e736665722066726f6d206163636f756e742030') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[0]
        });
    });
});
