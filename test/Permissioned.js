'use strict';

const assertJump = require('./helpers/assertJump');
const PermissionedTest1 = artifacts.require('samplecontracts/PermissionedTest1.sol');

const sha3 = require('solidity-sha3').default;

const PERMS_SET_INT = sha3('permissioned: set int');
const PERMS_SET_BOOL = sha3('permissioned: set bool');

contract('Permissioned', accounts => {
  it('cannot access a method without permission', async function() {
    const instance = await PermissionedTest1.new();
    try {
        await instance.setBool(true, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });

  it('can access a method with permission', async function() {
    const instance = await PermissionedTest1.new();
    await instance.setPermission(accounts[1], PERMS_SET_BOOL, true);
    await instance.setBool(true, {from: accounts[1]});
  });

  it('does not leak permissions across accounts', async function() {
    const instance = await PermissionedTest1.new();
    try {
        await instance.setBool(true, {from: accounts[2]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });

  it('does not leak permissions across permission IDs', async function() {
    const instance = await PermissionedTest1.new();
    try {
        await instance.setInt(1, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });

  it('can have permissions revoked', async function() {
    const instance = await PermissionedTest1.new();
    await instance.setPermission(accounts[1], PERMS_SET_BOOL, false);
    try {
        await instance.setBool(true, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });

  it('does not allow permissions to be set by an unauthorised user', async function() {
    const instance = await PermissionedTest1.new();
    try {
        await instance.setPermission(accounts[0], PERMS_SET_BOOL, true, {from: accounts[1]});
        assert.fail();
    } catch(error) {
        assertJump(error);
    }
  });
});
