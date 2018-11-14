'use strict';

const ERC777Token = artifacts.require('ERC777Token');
const EmitMessage = artifacts.require('EmitMessage');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('EmitMessage', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x820b586C8C28125366C998641B09DCbE7d4cBF06');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });

        // accounts[1] is our test source address so send it some tokens
        await erc777Instance.send(accounts[1], granularity.mul(100), '', {
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
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(5), '', {
            from: accounts[1]
        });
        
        // Set up a message for accounts[1] -> accounts[2]
        await instance.setMessage(accounts[2], 'Transfer to account 2', {
            from: accounts[1]
        });
        assert.equal(await instance.getMessage(accounts[1], accounts[2]), 'Transfer to account 2');

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(5), '', {
            from: accounts[1]
        });
        // Ensure the message is present
        assert.equal(2, tx.receipt.logs.length);
        var found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
            if (tx.receipt.logs[i].topics[0] == web3.sha3('Message(address,address,string)') &&
                tx.receipt.logs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742032') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Set up a message for accounts[1]
        await instance.setMessage(0, 'Transfer from account 1', {
            from: accounts[1]
        });
        assert.equal(await instance.getMessage(accounts[1], 0), 'Transfer from account 1');

        // Transfer tokens to accounts[2]
        var tx = await erc777Instance.send(accounts[2], granularity.mul(5), '', {
            from: accounts[1]
        });

        // Ensure the specific message is present
        assert.equal(2, tx.receipt.logs.length);
        found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
            if (tx.receipt.logs[i].topics[0] == web3.sha3('Message(address,address,string)') &&
                tx.receipt.logs[i].data.slice(258,300) == '5472616e7366657220746f206163636f756e742032') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Transfer tokens to accounts[3]
        var tx = await erc777Instance.send(accounts[3], granularity.mul(5), '', {
            from: accounts[1]
        });

        // Ensure the general message is present
        assert.equal(2, tx.receipt.logs.length);
        found = false;
        for (var i = 0; i < tx.receipt.logs.length; i++) {
           if (tx.receipt.logs[i].topics[0] == web3.sha3('Message(address,address,string)') &&
               tx.receipt.logs[i].data.slice(258,304) == '5472616e736665722066726f6d206163636f756e742031') {
                found = true;
            }
        }
        assert.equal(true, found);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });
});
