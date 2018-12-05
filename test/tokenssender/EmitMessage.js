'use strict';

const erc820 = require('../helpers/erc820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const EmitMessage = artifacts.require('EmitMessage');

contract('EmitMessage', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    it('sets up', async function() {
        erc820Instance = await erc820.instance();
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });

        // accounts[1] is our test source address so send it some tokens
        await erc777Instance.send(accounts[1], granularity.mul(web3.utils.toBN('100')), [], {
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
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(web3.utils.toBN('5')), [], {
            from: accounts[1]
        });
        
        // Set up a message for accounts[1] -> accounts[2]
        await instance.setMessage(accounts[2], 'Transfer to account 2', {
            from: accounts[1]
        });
        assert.equal(await instance.getMessage(accounts[1], accounts[2]), 'Transfer to account 2');

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(web3.utils.toBN('5')), [], {
            from: accounts[1]
        });

        // Ensure the message is present
        assert.equal(2, tx.receipt.rawLogs.length);
        var found = false;
        for (var i = 0; i < tx.receipt.rawLogs.length; i++) {
            if (tx.receipt.rawLogs[i].topics[0] == web3.utils.soliditySha3('Message(address,address,string)') &&
                tx.receipt.rawLogs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742032') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Set up a message for accounts[1]
        await instance.setMessage('0x0000000000000000000000000000000000000000', 'Transfer from account 1', {
            from: accounts[1]
        });
        assert.equal(await instance.getMessage(accounts[1], '0x0000000000000000000000000000000000000000'), 'Transfer from account 1');

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(web3.utils.toBN('5')), [], {
            from: accounts[1]
        });

        // Ensure the specific message is present
        assert.equal(2, tx.receipt.rawLogs.length);
        found = false;
        for (var i = 0; i < tx.receipt.rawLogs.length; i++) {
            if (tx.receipt.rawLogs[i].topics[0] == web3.utils.soliditySha3('Message(address,address,string)') &&
                tx.receipt.rawLogs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742032') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Transfer tokens to accounts[3]
        var tx = await erc777Instance.send(accounts[3], granularity.mul(web3.utils.toBN('5')), [], {
            from: accounts[1]
        });

        // Ensure the general message is present
        assert.equal(2, tx.receipt.rawLogs.length);
        found = false;
        for (var i = 0; i < tx.receipt.rawLogs.length; i++) {
           if (tx.receipt.rawLogs[i].topics[0] == web3.utils.soliditySha3('Message(address,address,string)') &&
               tx.receipt.rawLogs[i].data.slice(258,304) == '5472616e736665722066726f6d206163636f756e742031') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });
});
