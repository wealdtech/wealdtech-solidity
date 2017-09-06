'use strict';

const assertJump = require('./helpers/assertJump');
const F1 = artifacts.require('./router/F1.sol');
const Router = artifacts.require('./router/Router.sol');

const sha3 = require('solidity-sha3').default;

contract('Router', accounts => {
    var router;
    var f1;

//    const tokenOwner = accounts[0];
//    const faucetOwner = accounts[1];
//    const requestor = accounts[2];

    it ('can set up the contracts', async () => {
        router = await Router.new();
        f1 = await F1.new();
        await router.addRoutes(f1.address);
    });

    it ('can route', async () => {
        val = router.sendTransaction(
        var active = await faucet.active();
        assert.equal(active, false);
        const tx = await token.transfer(faucet.address, 1000, {from: tokenOwner});
        const tokens = await token.balanceOf(faucet.address);
        assert.equal(tokens, 1000);
        active = await faucet.active();
        assert.equal(active, true);
    });
//
//    it ('rejects requests for too many tokens', async () => {
//        try {
//            await faucet.sendTransaction({from: requestor, value: 101});
//            assert.fail();
//        } catch (error) {
//            assertJump(error);
//        }
//    });
//
//    it ('can exchange Ether for tokens', async () => {
//        const tx = await faucet.sendTransaction({from: requestor, value: 10});
//        const tokens = await token.balanceOf(requestor);
//        assert.equal(tokens, 100);
//    });
//
//    it ('can be drained', async () => {
//        await faucet.sendTransaction({from: requestor, value: 90});
//        var active = await faucet.active();
//        assert.equal(active, false);
//    });
});
