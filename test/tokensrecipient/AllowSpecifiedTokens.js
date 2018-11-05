'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const AllowSpecifiedTokens = artifacts.require('AllowSpecifiedTokens');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('AllowSpecifiedTokens', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    let expectedBalances = [
        web3.toBigNumber(0),
        web3.toBigNumber(0),
        web3.toBigNumber(0),
        web3.toBigNumber(0),
        web3.toBigNumber(0)
    ];
    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    // Helper to confirm that balances are as expected
    async function confirmBalances() {
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await erc777Instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10), 'Balance of account ' + i + ' is incorrect');
        }
        // Also confirm total supply
        assert.equal((await erc777Instance.totalSupply()).toString(), expectedBalances.reduce((a, b) => a.add(b), web3.toBigNumber('0')).toString(), 'Total supply is incorrect');
    }

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x820A8Cfd018b159837d50656c49d28983f18f33c');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        expectedBalances[0] = initialSupply.mul(1);
        await confirmBalances();
    });

    it('creates the recipient contract', async function() {
        instance = await AllowSpecifiedTokens.new({
            from: accounts[0]
        });
    });

    it('allows transfers accordingly', async function() {
        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], granularity.mul(100), '', {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        await confirmBalances();

        // Register the recipient
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensRecipient'), instance.address, {
            from: accounts[1]
        });

        // Attempt to transfer tokens to accounts[1] - should fail
        try {
            await erc777Instance.send(accounts[1], granularity.mul(100), '', {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Allow transfers from token
        await instance.addToken(erc777Instance.address, {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], granularity.mul(100), '', {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        await confirmBalances();

        // Clear allowance
        await instance.removeToken(erc777Instance.address, {
            from: accounts[1]
        });

        // Attempt to transfer tokens to accounts[1] - should fail
        try {
            await erc777Instance.send(accounts[1], granularity.mul(100), '', {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the recipient
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensRecipient'), 0, {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], granularity.mul(100), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        await confirmBalances();
    });
});
