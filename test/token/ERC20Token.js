'use strict';

const assertRevert = require('../helpers/assertRevert');
const ERC20Token = artifacts.require('./ERC20Token.sol');
const sha3 = require('solidity-sha3').default;

function pack(addr, value) {
    return '0x' + ('000000000000000000000000' + value.toString(16)).slice(-24) + addr.slice(2);
}


contract('ERC20Token', accounts => {
    var oldInstance;
    var instance;
    let expectedBalances = [10000,0,0,0,0,0,0,0,0,0]

    it('has an initial balance', async function() {
        instance = await ERC20Token.new(1, 'Test token', 'TST', 2, 10000, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[0]
        });
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer normally', async function() {
        await instance.transfer(accounts[1], 1);
        expectedBalances[0] -= 1;
        expectedBalances[1] += 1;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer multiple (1)', async function() {
        var amounts = [];
        amounts.push(pack(accounts[1], 1));
        await instance.bulkTransfer(amounts);
        expectedBalances[0] -= 1;
        expectedBalances[1] += 1;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer multiple (2)', async function() {
        var amounts = [];
        amounts.push(pack(accounts[1], 2));
        amounts.push(pack(accounts[2], 3));
        await instance.bulkTransfer(amounts);
        expectedBalances[0] -= 5;
        expectedBalances[1] += 2;
        expectedBalances[2] += 3;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer multiple (3)', async function() {
        var amounts = [];
        amounts.push(pack(accounts[1], 2));
        amounts.push(pack(accounts[2], 3));
        amounts.push(pack(accounts[3], 4));
        await instance.bulkTransfer(amounts);
        expectedBalances[0] -= 9;
        expectedBalances[1] += 2;
        expectedBalances[2] += 3;
        expectedBalances[3] += 4;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer multiple (4)', async function() {
        var amounts = [];
        amounts.push(pack(accounts[1], 100));
        amounts.push(pack(accounts[2], 100));
        amounts.push(pack(accounts[3], 100));
        await instance.bulkTransfer(amounts);
        expectedBalances[0] -= 300;
        expectedBalances[1] += 100;
        expectedBalances[2] += 100;
        expectedBalances[3] += 100;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
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
        expectedBalances[0] -= 9;
        expectedBalances[1] += 1;
        expectedBalances[2] += 1;
        expectedBalances[3] += 1;
        expectedBalances[4] += 1;
        expectedBalances[5] += 1;
        expectedBalances[6] += 1;
        expectedBalances[7] += 1;
        expectedBalances[8] += 1;
        expectedBalances[9] += 1;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can transfer multiple (100)', async function() {
        var amounts = [];
        for (var i = 1; i <= 100; i++) {
            amounts.push(pack('0x' + ('0000000000000000000000000000000000000000' + i.toString(16)).slice(-40), 1));
        }
        await instance.bulkTransfer(amounts);
        expectedBalances[0] -= 100;
        // Destinations aren't in the accounts list so no need to alter their balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('can carry out a targeted third-party transfer', async function() {
        // User who wants to allow the third-party transfer signs an appropriate message
        const dataHash = sha3(instance.address, accounts[0], accounts[1], '0x00000000000000000000000000000000000000000000000000000000000003E8', '0x0000000000000000000000000000000000000000000000000000000000000001');
        const signature = await web3.eth.sign(accounts[0], dataHash);

        // Ensure that the transaction can be submitted by an account with no relationship to the sender or recipient
        await instance.transferTP(accounts[0], accounts[1], 1000, 1, signature, {
            from: accounts[4]
        });
        expectedBalances[0] -= 1000;
        expectedBalances[1] += 1000;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }

        // Ensure we cannot reuse the signature
        try {
            await instance.transferTP(accounts[0], accounts[1], 1000, 1, signature, {
                from: accounts[4]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can carry out an untargeted third-party transfer', async function() {
        // User who wants to allow the third-party transfer signs an appropriate message
        const dataHash = sha3(instance.address, accounts[0], '0x00000000000000000000000000000000000000000000000000000000000003E8', '0x0000000000000000000000000000000000000000000000000000000000000001');
        const signature = await web3.eth.sign(accounts[0], dataHash);

        // Ensure that the transaction can be submitted by an account with no relationship to the sender or recipient
        await instance.transferTP(accounts[0], accounts[5], 1000, 1, signature, {
            from: accounts[4]
        });
        expectedBalances[0] -= 1000;
        expectedBalances[5] += 1000;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }

        // Ensure we cannot reuse the signature
        try {
            await instance.transferTP(accounts[0], accounts[6], 1000, 1, signature, {
                from: accounts[7]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can use approveAndCall()', async function() {
        assert.fail('TODO');
    });

    it('can upgrade to a new contract', async function() {
        oldInstance = instance;
        instance = await ERC20Token.new(2, 'Test token', 'TST', 2, 10000, await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[1]
        });
        // Ensure that the new instance has access to the store
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }

        // Carry out the upgrade
        await oldInstance.preUpgrade(instance.address, {
            from: accounts[0]
        });
        await oldInstance.upgrade({
            from: accounts[0]
        });
        await oldInstance.commitUpgrade({
            from: accounts[0]
        });

        // Ensure the new contract can carry out transfers
        await instance.transfer(accounts[1], 1, {
            from: accounts[0]
        });
        expectedBalances[0] -= 1;
        expectedBalances[1] += 1;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('cannot be accessed by an old contract', async function() {
        try {
            await oldInstance.transfer(accounts[1], 1, {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can upgrade again', async function() {
        oldInstance = instance;
        instance = await ERC20Token.new(3, 'Test token', 'TST', 2, 10000, await oldInstance.store(), {
            from: accounts[2],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[2]
        });

        // Carry out the upgrade
        await oldInstance.preUpgrade(instance.address, {
            from: accounts[1]
        });
        await oldInstance.upgrade({
            from: accounts[1]
        });
        await oldInstance.commitUpgrade({
            from: accounts[1]
        });

        // Ensure the new contract can carry out transfers
        await instance.transfer(accounts[1], 1, {
            from: accounts[0]
        });
        expectedBalances[0] -= 1;
        expectedBalances[1] += 1;
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal(await instance.balanceOf(accounts[i]), expectedBalances[i]);
        }
    });

    it('cannot be upgraded by someone else', async function() {
        var fakeInstance = await ERC20Token.new(4, 'Test token', 'TST', 2, 10000, await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await fakeInstance.activate({
            from: accounts[1]
        });
        try {
            await instance.preUpgrade(fakeInstance.address, {
                from: accounts[3]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('cannot be sidegraded', async function() {
        var sideInstance = await ERC20Token.new(3, 'Test token', 'TST', 2, 10000, await oldInstance.store(), {
            from: accounts[2],
            gas: 10000000
        });
        await sideInstance.activate({
            from: accounts[2]
        });
        try {
            await instance.preUpgrade(sideInstance.address, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });
});

// Use a new instance for testing token dividends
contract('Dividend Token', accounts => {
    var total = 80000;
    var instance;

    let expectedBalances = [60000, 10000, 10000];

    it('has an initial balance', async function() {
        instance = await ERC20Token.new(1, 'Test token', 'TST', 3, 80000, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[0]
        });
        await instance.transfer(accounts[1], 10000, {
            from: accounts[0]
        });
        await instance.transfer(accounts[2], 10000, {
            from: accounts[0]
        });

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
        }
    });

    it('can issue a dividend', async function() {
        const dividend = 10000;
        await instance.issueDividend(dividend, {
            from: accounts[0]
        });
        // Reduction for transfer
        expectedBalances[0] -= dividend;
        // Addition for dividends
        expectedBalances[0] *= (1 + dividend / (total - dividend));
        expectedBalances[0] = Math.floor(expectedBalances[0]);
        expectedBalances[1] *= (1 + dividend / (total - dividend));
        expectedBalances[1] = Math.floor(expectedBalances[1]);
        expectedBalances[2] *= (1 + dividend / (total - dividend));
        expectedBalances[2] = Math.floor(expectedBalances[2]);

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
        }
    });

    it('maintains balances after a transfer', async function() {
        await instance.transfer(accounts[1], 10000, {
            from: accounts[0]
        });
        expectedBalances[0] -= 10000;
        expectedBalances[1] += 10000;

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
        }
    });

    it('handles multiple unclaimed dividends', async function() {
        const dividend = 2000;
        await instance.issueDividend(dividend, {
            from: accounts[0]
        });
        // Reduction for transfer
        expectedBalances[0] -= dividend;
        // Addition for dividends
        expectedBalances[0] *= (1 + dividend / (total - dividend));
        expectedBalances[0] = Math.floor(expectedBalances[0]);
        expectedBalances[1] *= (1 + dividend / (total - dividend));
        expectedBalances[1] = Math.floor(expectedBalances[1]);
        expectedBalances[2] *= (1 + dividend / (total - dividend));
        expectedBalances[2] = Math.floor(expectedBalances[2]);

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
        }
    });

    it('can issue many dividends', async function() {
        const dividend = 1000;
        for (var i = 0; i < 20; i++) {
            await instance.issueDividend(dividend, {
                from: accounts[0]
            });
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
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(), expectedBalances[i]);
        }
    });

    it('still works after additional coins have been minted', async function() {
        // Set a dividend
        const dividend1 = 2000;
        await instance.issueDividend(dividend1, {
            from: accounts[0]
        });
        expectedBalances[0] -= dividend1;
        expectedBalances[0] *= (1 + dividend1 / (total - dividend1));
        expectedBalances[0] = Math.floor(expectedBalances[0]);
        expectedBalances[1] *= (1 + dividend1 / (total - dividend1));
        expectedBalances[1] = Math.floor(expectedBalances[1]);
        expectedBalances[2] *= (1 + dividend1 / (total - dividend1));
        expectedBalances[2] = Math.floor(expectedBalances[2]);

        // Increase the token supply
        const addition = 1000;
        await instance.mint(addition, {
            from: accounts[0]
        });
        expectedBalances[0] += addition;
        total += addition;

        // Confirm the increase
        assert.equal((await instance.totalSupply()).toString(), total);
        assert.equal((await instance.balanceOf(accounts[0])).toString(), expectedBalances[0]);

        // Set a dividend
        const dividend2 = 5000;
        await instance.issueDividend(dividend2, {
            from: accounts[0]
        });
        expectedBalances[0] -= dividend2;
        expectedBalances[0] *= (1 + dividend2 / (total - dividend2));
        expectedBalances[0] = Math.floor(expectedBalances[0]);
        expectedBalances[1] *= (1 + dividend2 / (total - dividend2));
        expectedBalances[1] = Math.floor(expectedBalances[1]);
        expectedBalances[2] *= (1 + dividend2 / (total - dividend2));
        expectedBalances[2] = Math.floor(expectedBalances[2]);

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
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

    let expectedBalances = [web3.toWei('996000', 'ether'), web3.toWei('2000', 'ether'), web3.toWei('2000', 'ether')]

    it('has an initial balance', async function() {
        instance = await ERC20Token.new(1, 'Test token', 'TST', 18, 1000000000000000000000000, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[0]
        });
        await instance.transfer(accounts[1], web3.toWei('2000', 'ether'), {
            from: accounts[0]
        });
        await instance.transfer(accounts[2], web3.toWei('2000', 'ether'), {
            from: accounts[0]
        });

        // Confirm balances
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10));
        }
    });
});
