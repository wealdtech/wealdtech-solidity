'use strict';

const assertRevert = require('../helpers/assertRevert.js');
const erc1820 = require('../helpers/erc1820.js');

const ERC777Token = artifacts.require('ERC777Token');
const AllowSpecifiedTokens = artifacts.require('AllowSpecifiedTokens');

contract('AllowSpecifiedTokens', accounts => {
    var erc777Instance;
    var erc1820Instance;
    var instance;

    let expectedBalances = [
        web3.utils.toBN(0),
        web3.utils.toBN(0),
        web3.utils.toBN(0),
        web3.utils.toBN(0),
        web3.utils.toBN(0)
    ];
    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    // Helper to confirm that balances are as expected
    async function confirmBalances() {
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await erc777Instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10), 'Balance of account ' + i + ' is incorrect');
        }
        // Also confirm total supply
        assert.equal((await erc777Instance.totalSupply()).toString(), expectedBalances.reduce((a, b) => a.add(b), web3.utils.toBN('0')).toString(), 'Total supply is incorrect');
    }

    it('sets up', async function() {
        erc1820Instance = await erc1820.instance();
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        expectedBalances[0] = initialSupply.mul(web3.utils.toBN('1'));
        await confirmBalances();
    });

    it('creates the recipient contract', async function() {
        instance = await AllowSpecifiedTokens.new({
            from: accounts[0]
        });
    });

    it('allows transfers accordingly', async function() {
        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        const amount = granularity.mul(web3.utils.toBN('100'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(amount);
        expectedBalances[1] = expectedBalances[1].add(amount);
        await confirmBalances();

        // Register the recipient
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), instance.address, {
            from: accounts[1]
        });

        // Attempt to transfer tokens to accounts[1] - should fail
        try {
            await erc777Instance.send(accounts[1], amount, [], {
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
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(amount);
        expectedBalances[1] = expectedBalances[1].add(amount);
        await confirmBalances();

        // Clear allowance
        await instance.removeToken(erc777Instance.address, {
            from: accounts[1]
        });

        // Attempt to transfer tokens to accounts[1] - should fail
        try {
            await erc777Instance.send(accounts[1], amount, [], {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the recipient
        await erc1820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensRecipient'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(amount);
        expectedBalances[1] = expectedBalances[1].add(amount);
        await confirmBalances();
    });
});
