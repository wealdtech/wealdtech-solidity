'use strict';

const assertRevert = require('../helpers/assertRevert');
const AuthorisedTest1 = artifacts.require('samplecontracts/AuthorisedTest1.sol');

const sha3 = require('solidity-sha3').default;

contract('Authorised', accounts => {
  var instance;

  it('can create a contract instance', async function() {
    instance = await AuthorisedTest1.new();
  });

  it('cannot carry out an authorised action', async function() {
    try {
        await instance.setInt(5, '', {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }
  });

  it('can authorise an action with suitable signature', async function() {
    // Create and sign an action allowing accounts[1] to set int values
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT());
    const signature = await web3.eth.sign(accounts[0], actionHash);

    await instance.setInt(5, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 5);
    await instance.setInt(6, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 6);
  });

  it('can only carry out an unrepeatable action once', async function() {
    // Create and sign an action allowing accounts[1] to set int value once only
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT_ONCE());
    const signature = await web3.eth.sign(accounts[0], actionHash);

    await instance.setInt(7, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 7);
    try {
        await instance.setInt(8, signature, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }
  });

  it('can authorise an action with a value', async function() {
    // Create and sign an action allowing accounts[1] to set a specific int value
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT(), '0x0000000000000000000000000000000000000000000000000000000000000008');
    const signature = await web3.eth.sign(accounts[0], actionHash);

    await instance.setInt(8, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 8);
    try {
        await instance.setInt(9, signature, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }
  });

  it('can only carry out an unrepeatable action with a value once', async function() {
    // Create and sign an action allowing accounts[1] to set a specific int value once
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT_ONCE(), '0x0000000000000000000000000000000000000000000000000000000000000009');
    const signature = await web3.eth.sign(accounts[0], actionHash);

    await instance.setInt(9, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 9);
    try {
        await instance.setInt(9, signature, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }
  });

  it('can add another authoriser', async function() {
    // Create and sign an action allowing accounts[1] to set int values
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT());
    const signature = await web3.eth.sign(accounts[2], actionHash);

    // Ensure the signature is not accepted as the signer is not an authoriser
    try {
        await instance.setInt(10, signature, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }

    // Add accounts[2] to the list of authorisers
    await instance.setPermission(accounts[2], await instance.PERM_AUTHORISER(), true);

    // Ensure the signature is now accepted
    await instance.setInt(10, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 10);
  });

  it('can remove an authoriser', async function() {
    // Create and sign an action allowing accounts[1] to set int values
    const actionHash = sha3(accounts[1], await instance.ACTION_SET_INT());
    const signature = await web3.eth.sign(accounts[2], actionHash);

    // Ensure the signature is accepted
    await instance.setInt(11, signature, {from: accounts[1]});
    assert.equal(await instance.intValue(), 11);

    // Remove accounts[2] from the list of authorisers
    await instance.setPermission(accounts[2], await instance.PERM_AUTHORISER(), false);

    // Ensure the signature is not accepted as the signer is no longer an authoriser
    try {
        await instance.setInt(12, signature, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertRevert(error);
    }
  });
});
