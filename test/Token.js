'use strict';

const assertJump = require('./helpers/assertJump');
const Token = artifacts.require('./Token.sol');

const sha3 = require('solidity-sha3').default;

function pack(addr, value) {
    return '0x' + ('000000000000000000000000' + value.toString(16)).slice(-24) + addr.slice(2);
}

contract('Token', accounts => {
  var instance;
  var oldInstance;

  let expectedBalance0 = 10000;

  it('has an initial balance', async function() {
    instance = await Token.new('Test token', 'TST', 2, 100, 0, {from: accounts[0]});
    var balance = await instance.balanceOf(accounts[0]);
    assert.equal(await instance.balanceOf(accounts[0]), expectedBalance0);
  });

  it('can transfer normally', async function() {
    var tx = await instance.transfer(accounts[1], 1);
    assert.equal(await instance.balanceOf(accounts[0]), 9999);
    assert.equal(await instance.balanceOf(accounts[1]), 1);
  });

  it('can transfer multiple (1)', async function() {
    var amounts = [];
    amounts.push(pack(accounts[1], 1));
    var tx = await instance.bulkTransfer(amounts);
    assert.equal(await instance.balanceOf(accounts[0]), 9998);
    assert.equal(await instance.balanceOf(accounts[1]), 2);
  });

  it('can transfer multiple (2)', async function() {
    var amounts = [];
    amounts.push(pack(accounts[1], 2));
    amounts.push(pack(accounts[2], 3));
    var tx = await instance.bulkTransfer(amounts);
    assert.equal(await instance.balanceOf(accounts[0]), 9993);
    assert.equal(await instance.balanceOf(accounts[1]), 4);
    assert.equal(await instance.balanceOf(accounts[2]), 3);
  });

  it('can transfer multiple (3)', async function() {
    var amounts = [];
    amounts.push(pack(accounts[1], 2));
    amounts.push(pack(accounts[2], 3));
    amounts.push(pack(accounts[3], 4));
    var tx = await instance.bulkTransfer(amounts);
    assert.equal(await instance.balanceOf(accounts[0]), 9984);
    assert.equal(await instance.balanceOf(accounts[1]), 6);
    assert.equal(await instance.balanceOf(accounts[2]), 6);
    assert.equal(await instance.balanceOf(accounts[3]), 4);
  });

  it('can transfer multiple (4)', async function() {
    var amounts = [];
    amounts.push(pack(accounts[1], 100));
    amounts.push(pack(accounts[2], 100));
    amounts.push(pack(accounts[3], 100));
    var tx = await instance.bulkTransfer(amounts);
    assert.equal(await instance.balanceOf(accounts[0]), 9684);
    assert.equal(await instance.balanceOf(accounts[1]), 106);
    assert.equal(await instance.balanceOf(accounts[2]), 106);
    assert.equal(await instance.balanceOf(accounts[3]), 104);
  });

  it('can transfer multiple (9)', async function() {
    var amounts = [];
    amounts.push(pack(accounts[1], 1));
    amounts.push(pack(accounts[2], 1));
    amounts.push(pack(accounts[3], 1));
    amounts.push(pack(accounts[4], 1));
    amounts.push(pack(accounts[5], 1));
    amounts.push(pack(accounts[6], 1));
    amounts.push(pack(accounts[7], 1));
    amounts.push(pack(accounts[8], 1));
    amounts.push(pack(accounts[9], 1));
    await instance.bulkTransfer(amounts);
    assert.equal(await instance.balanceOf(accounts[0]), 9675);
  });

  it('can transfer multiple (100)', async function() {
    var amounts = [];
    for (var i = 1; i <= 100; i ++) {
        amounts.push(pack('0x' + ('0000000000000000000000000000000000000000' + i.toString(16)).slice(-40), 1));
    }
    await instance.bulkTransfer(amounts);
  });

  it('can upgrade to a new contract', async function() {
    oldInstance = instance;
    instance = await Token.new('Test token', 'TST', 2, 100, await oldInstance.store(), {from: accounts[1]});
    // Ensure that the new instance has access to the store
    assert.equal(await instance.balanceOf(accounts[0]), 9575);
    
    // Carry out the upgrade
    await oldInstance.preUpgrade(instance.address, {from: accounts[0]});
    await oldInstance.upgrade({from: accounts[0]});
    await oldInstance.postUpgrade({from: accounts[0]});

    // Ensure the new contract can carry out transfers
    assert.equal(await instance.balanceOf(accounts[0]), 9575);
    assert.equal(await instance.balanceOf(accounts[1]), 107);
    await instance.transfer(accounts[1], 1, {from: accounts[0]});
    assert.equal(await instance.balanceOf(accounts[0]), 9574);
    assert.equal(await instance.balanceOf(accounts[1]), 108);
  });

  it('cannot be accessed by an old contract', async function() {
    try {
        await oldInstance.transfer(accounts[1], 1, {from: accounts[0]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });

  it('can upgrade again', async function() {
    oldInstance = instance;
    instance = await Token.new('Test token', 'TST', 2, 100, await oldInstance.store(), {from: accounts[2]});

    // Carry out the upgrade
    await oldInstance.preUpgrade(instance.address, {from: accounts[1]});
    await oldInstance.upgrade({from: accounts[1]});
    await oldInstance.postUpgrade({from: accounts[1]});

    // Ensure the new contract can carry out transfers
    assert.equal(await instance.balanceOf(accounts[0]), 9574);
    assert.equal(await instance.balanceOf(accounts[1]), 108);
    await instance.transfer(accounts[1], 1, {from: accounts[0]});
    assert.equal(await instance.balanceOf(accounts[0]), 9573);
    assert.equal(await instance.balanceOf(accounts[1]), 109);
  });

  it('cannot be upgraded by someone else', async function() {
    var fakeInstance = await Token.new('Test token', 'TST', 2, 100, await oldInstance.store(), {from: accounts[1]});
    try {
        await instance.preUpgrade(instance.address, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });
});
