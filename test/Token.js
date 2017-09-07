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

// Use a new instance for testing token dividends
contract('Dividend Token', accounts => {
  var total = 50000;
  var instance;

  let expectedBalances = [ 30000, 10000, 10000 ];

  it('has an initial balance', async function() {
      instance = await Token.new('Test token', 'TST', 3, 50, 0, {from: accounts[0]});
      await instance.transfer(accounts[1], 10000, {from: accounts[0]});
      await instance.transfer(accounts[2], 10000, {from: accounts[0]});

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('can add a dividend', async function() {
      await instance.issueDividend(10000, {from: accounts[0]});
      // Reduction for transfer
      expectedBalances[0] -= 10000;
      // Addition for dividends
      expectedBalances[0] *= 1.25;
      expectedBalances[1] *= 1.25;
      expectedBalances[2] *= 1.25;

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('maintains balances after a transfer', async function() {
      await instance.transfer(accounts[1], 10000, {from: accounts[0]});
      expectedBalances[0] -= 10000;
      expectedBalances[1] += 10000;

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('handles multiple unclaimed dividends', async function() {
      const dividend = 10000;
      await instance.issueDividend(dividend, {from: accounts[0]});
      // Reduction for transfer
      expectedBalances[0] -= dividend;
      // Addition for dividends
      expectedBalances[0] *= (1 + dividend / (total - dividend));
      expectedBalances[1] *= (1 + dividend / (total - dividend));
      expectedBalances[2] *= (1 + dividend / (total - dividend));

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('can create many dividends', async function() {
      const dividend = 250;
      for (var i = 0; i < 20; i++) {
          await instance.issueDividend(dividend, {from: accounts[0]});
          // Reduction for transfer
          expectedBalances[0] -= dividend;
          // Addition for dividends
          expectedBalances[0] *= (1 + dividend / (total - dividend));
          expectedBalances[0] = Math.floor(expectedBalances[0]);
          expectedBalances[1] *= (1 + dividend / (total - dividend));
          expectedBalances[1] = Math.floor(expectedBalances[1]);
          expectedBalances[2] *= (1 + dividend / (total - dividend));
          expectedBalances[2] = Math.floor(expectedBalances[2]);
      }

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('still works after additional coins have been minted', async function() {
      // Set a dividend
      const dividend1 = 200;
      await instance.issueDividend(dividend1, {from: accounts[0]});
      expectedBalances[0] -= dividend1;
      expectedBalances[0] *= (1 + dividend1 / (total - dividend1));
      expectedBalances[0] = Math.floor(expectedBalances[0]);
      expectedBalances[1] *= (1 + dividend1 / (total - dividend1));
      expectedBalances[1] = Math.floor(expectedBalances[1]);
      expectedBalances[2] *= (1 + dividend1 / (total - dividend1));
      expectedBalances[2] = Math.floor(expectedBalances[2]);

      // Increase the token supply
      const addition = 10;
      await instance.mint(addition, {from: accounts[0]});
      expectedBalances[0] += addition * 1000;
      total += addition * 1000;

      // Confirm the increase
      assert.equal((await instance.totalSupply()).toString(), total);
      assert.equal((await instance.balanceOf(accounts[0])).toString(), expectedBalances[0]);

      // Set a dividend
      const dividend2 = 200;
      await instance.issueDividend(dividend2, {from: accounts[0]});
      expectedBalances[0] -= dividend2;
      expectedBalances[0] *= (1 + dividend2 / (total - dividend2));
      expectedBalances[0] = Math.floor(expectedBalances[0]);
      expectedBalances[1] *= (1 + dividend2 / (total - dividend2));
      expectedBalances[1] = Math.floor(expectedBalances[1]);
      expectedBalances[2] *= (1 + dividend2 / (total - dividend2));
      expectedBalances[2] = Math.floor(expectedBalances[2]);

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });
});

// Use a new instance for testing token dividends
contract('Realistic Dividend Token', accounts => {
  // Pretend to be an ether-like token
  // 1,000,000 * 10^18
  var total = web3.toWei('1000000', 'ether');
  var instance;

  let expectedBalances = [ web3.toWei('996000', 'ether'), web3.toWei('2000', 'ether'), web3.toWei('2000', 'ether') ]

  it('has an initial balance', async function() {
      instance = await Token.new('Test token', 'TST', 18, 1000000, 0, {from: accounts[0]});
      await instance.transfer(accounts[1], web3.toWei('2000', 'ether'), {from: accounts[0]});
      await instance.transfer(accounts[2], web3.toWei('2000', 'ether'), {from: accounts[0]});

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10));
      }
  });

  it('can add a dividend', async function() {
      const dividend = web3.toWei(1000, 'ether');
      await instance.issueDividend(dividend, {from: accounts[0]});
      // Reduction for transfer
      expectedBalances[0] -= dividend;
      // Addition for dividends
console.log(expectedBalances[0].toString(10));
console.log(typeof expectedBalances[0]);
console.log(dividend);
console.log(typeof dividend);
      expectedBalances[0] += web3.toWei(expectedBalances[0] * dividend / (total - dividend), 'wei');
      expectedBalances[1] += web3.toWei(expectedBalances[1] * dividend / (total - dividend), 'wei');
      expectedBalances[2] += web3.toWei(expectedBalances[2] * dividend / (total - dividend), 'wei');

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10));
      }
  });

  it('maintains balances after a transfer', async function() {
      const amount =web3.toWei(1.76544, 'ether');
      await instance.transfer(accounts[1], amount, {from: accounts[0]});
      expectedBalances[0] -= amount;
      expectedBalances[1] += amount;

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('handles multiple unclaimed dividends', async function() {
      const dividend =web3.toWei(10.546638436, 'ether');
      await instance.issueDividend(dividend, {from: accounts[0]});
      // Reduction for transfer
      expectedBalances[0] -= dividend;
      // Addition for dividends
      expectedBalances[0] *= (1 + dividend / (total - dividend));
      expectedBalances[1] *= (1 + dividend / (total - dividend));
      expectedBalances[2] *= (1 + dividend / (total - dividend));

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });

  it('can create many dividends', async function() {
      const dividend =web3.toWei(10.81703, 'ether');
      for (var i = 0; i < 100; i++) {
          await instance.issueDividend(dividend, {from: accounts[0]});
          // Reduction for transfer
          expectedBalances[0] -= dividend;
          // Addition for dividends
          expectedBalances[0] *= (1 + dividend / (total - dividend));
          expectedBalances[0] = Math.floor(expectedBalances[0]);
          expectedBalances[1] *= (1 + dividend / (total - dividend));
          expectedBalances[1] = Math.floor(expectedBalances[1]);
          expectedBalances[2] *= (1 + dividend / (total - dividend));
          expectedBalances[2] = Math.floor(expectedBalances[2]);
      }

      // Confirm balances
      for (var i = 0; i < expectedBalances.length; i ++) {
          assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
      }
  });
});
