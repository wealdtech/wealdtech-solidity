'use strict';

const assertJump = require('./helpers/assertJump');
const FaucetAgent = artifacts.require('./token/FaucetAgent.sol');
const TestToken = artifacts.require('./samplecontracts/TestToken.sol');
const ERC20 = artifacts.require('../node_modules/zeppelin-solidity/contracts/token/ERC20.sol');

contract('FaucetAgent', accounts => {
    const tokenOwner = accounts[0];
    const faucetOwner = accounts[1];
    const requestor = accounts[2];
    var token;
    var faucet;

    it ('can set up the contracts', async () => {
        token = await TestToken.new();
        faucet = await FaucetAgent.new(token.address, 10, {from: faucetOwner});
    });

    it ('can transfer tokens to the faucet agent', async () => {
        var active = await faucet.active();
        assert.equal(active, false);
        const tx = await token.transfer(faucet.address, 1000, {from: tokenOwner});
        const tokens = await token.balanceOf(faucet.address);
        assert.equal(tokens, 1000);
        active = await faucet.active();
        assert.equal(active, true);
    });

    it ('rejects requests for too many tokens', async () => {
        try {
            await faucet.obtain({from: requestor, value: 101});
            assert.fail();
        } catch (error) {
            assertJump(error);
        }
    });

    it ('can exchange Ether for tokens', async () => {
        const tx = await faucet.obtain({from: requestor, value: 10});
        const tokens = await token.balanceOf(requestor);
        assert.equal(tokens, 100);
    });

    it ('can be drained', async () => {
        await faucet.obtain({from: requestor, value: 90});
        var active = await faucet.active();
        assert.equal(active, false);
    });
});
