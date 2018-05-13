'use strict';

const assertRevert = require('../helpers/assertRevert');
const ERC20Token = artifacts.require('./ERC20Token.sol');
const BulkTransfer = artifacts.require('./BulkTransfer.sol');

function pack(addr, value) {
    return '0x' + ('000000000000000000000000' + value.toString(16)).slice(-24) + addr.slice(2);
}

contract('BulkTransfer', accounts => {
    var token;
    var bulkTransfer;

    let expectedBalance0 = 100000000000000000000000000;

    it('has an initial balance', async function() {
        token = await ERC20Token.new('Test token', 'TST', 18, 100000000000000000000000000, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await token.activate({
            from: accounts[0]
        });
        var balance = await token.balanceOf(accounts[0]);
        assert.equal(await token.balanceOf(accounts[0]), expectedBalance0);

        bulkTransfer = await BulkTransfer.new();

        await token.transfer(bulkTransfer.address, 1001001000);
        assert.equal(await token.balanceOf(bulkTransfer.address), 1001001000);
    });

    it('cannot be stolen', async function() {
        var addresses = [];
        var amounts = [];
        addresses.push(accounts[1]);
        amounts.push(1000);
        try {
            await bulkTransfer.bulkTransfer(token.address, addresses, amounts, {from: accounts[1]});
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can bulk transfer', async function() {
        var addresses = [];
        var amounts = [];
        addresses.push(accounts[1]);
        amounts.push(1000);
        addresses.push(accounts[2]);
        amounts.push(1000000);
        addresses.push(accounts[3]);
        amounts.push(1000000000);
        await bulkTransfer.bulkTransfer(token.address, addresses, amounts);
        assert.equal(await token.balanceOf(accounts[0]), 99999999999999998998999000);
        assert.equal(await token.balanceOf(accounts[1]), 1000);
        assert.equal(await token.balanceOf(accounts[2]), 1000000);
        assert.equal(await token.balanceOf(accounts[3]), 1000000000);
    });
});
