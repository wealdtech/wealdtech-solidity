'use strict';

const assertRevert = require('../helpers/assertRevert');
const FixedPriceTokenAgent = artifacts.require('./token/FixedPriceTokenAgent.sol');
const TestERC20Token = artifacts.require('./samplecontracts/TestERC20Token.sol');

contract('FixedPriceTokenAgent', accounts => {
    const tokenOwner = accounts[0];
    const faucetOwner = accounts[1];
    const requestor = accounts[2];
    var token;
    var faucet;

    it('can set up the contracts', async() => {
        token = await TestERC20Token.new({gas: 10000000});
        await token.activate();
        faucet = await FixedPriceTokenAgent.new(token.address, tokenOwner, 10, {
            from: faucetOwner
        });
    });

    it('can approve token transfers by the faucet agent', async() => {
        var active = await faucet.active();
        assert.equal(active, false);
        const tx = await token.approve(faucet.address, 1000, {
            from: tokenOwner
        });
        const tokens = await token.allowance(tokenOwner, faucet.address);
        assert.equal(tokens, 1000);
        active = await faucet.active();
        assert.equal(active, true);
    });

    it('rejects requests for too many tokens', async() => {
        try {
            await faucet.sendTransaction({
                from: requestor,
                value: 101
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can exchange Ether for tokens', async() => {
        const tx = await faucet.sendTransaction({
            from: requestor,
            value: 10
        });
        const tokens = await token.balanceOf(requestor);
        assert.equal(tokens, 100);
    });

    it('can be drained', async() => {
        await faucet.sendTransaction({
            from: requestor,
            value: 90
        });
        var active = await faucet.active();
        assert.equal(active, false);
    });
});
