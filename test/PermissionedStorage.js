'use strict';

const assertJump = require('./helpers/assertJump');
const PermissionedStorage = artifacts.require('./PermissionedStorage.sol');

const sha3 = require('solidity-sha3').default;

contract('Permissioned Storage', accounts => {
  var instance;

  it('can initialise permissioned storage', async() => {
    instance = await PermissionedStorage.new({ from: accounts[0] });
    assert.notEqual(instance, 0);
  });

  it('can read and write a string', async() => {
    const key = sha3("test string");
    const value = "Hello, world";

    const result1 = await instance.getString(key, { from: accounts[0] });
    assert.equal(result1, "");

    await instance.setString(key, value, { from: accounts[0] });
    const result2 = await instance.getString(key, { from: accounts[0] });
    assert.equal(result2, value);

    await instance.setString(key, "", { from: accounts[0] });
    const result3 = await instance.getString(key, { from: accounts[0] });
    assert.equal(result3, "");
  });

  it('can read and write a boolean', async() => {
    const key = sha3("test boolean");
    const value = true;

    await instance.setBoolean(key, false, { from: accounts[0] });
    const result1 = await instance.getBoolean(key, { from: accounts[0] });
    assert.equal(result1, false);

    await instance.setBoolean(key, value, { from: accounts[0] });
    const result2 = await instance.getBoolean(key, { from: accounts[0] });
    assert.equal(result2, value);

    await instance.setBoolean(key, false, { from: accounts[0] });
    const result3 = await instance.getBoolean(key, { from: accounts[0] });
    assert.equal(result3, false);
  });

  it('can read and write a uint256', async() => {
    const key = sha3("test uint256");
    const value = 12345;

    const result1 = await instance.getUInt256(key, { from: accounts[0] });
    assert.equal(result1, 0);

    await instance.setUInt256(key, value, { from: accounts[0] });
    const result2 = await instance.getUInt256(key, { from: accounts[0] });
    assert.equal(result2, value);

    await instance.setUInt256(key, 0, { from: accounts[0] });
    const result3 = await instance.getUInt256(key, { from: accounts[0] });
    assert.equal(result3, 0);
  });

  it('can read and write an int256', async() => {
    const key = sha3("test int256");
    const value = -12345;

    const result1 = await instance.getInt256(key, { from: accounts[0] });
    assert.equal(result1, 0);

    await instance.setInt256(key, value, { from: accounts[0] });
    const result2 = await instance.getInt256(key, { from: accounts[0] });
    assert.equal(result2, value);

    await instance.setInt256(key, 0, { from: accounts[0] });
    const result3 = await instance.getInt256(key, { from: accounts[0] });
    assert.equal(result3, 0);
  });

  it('can read and write an address', async() => {
    const key = sha3("test address");
    const value = accounts[1];

    const result1 = await instance.getAddress(key, { from: accounts[0] });
    assert.equal(result1, 0);

    await instance.setAddress(key, value, { from: accounts[0] });
    const result2 = await instance.getAddress(key, { from: accounts[0] });
    assert.equal(result2, value);

    await instance.setAddress(key, 0, { from: accounts[0] });
    const result3 = await instance.getAddress(key, { from: accounts[0] });
    assert.equal(result3, 0);
  });

  it('does not allow unauthorised writes', async() => {
    const key = sha3("test unauthorised");

    try {
      await instance.setBoolean(key, true, { from: accounts[1] });
      assert.fail();
    } catch (error) {
      assertJump(error);
    }
  });
});
