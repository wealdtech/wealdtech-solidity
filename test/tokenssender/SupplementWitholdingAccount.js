'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const SupplementWitholdingAccount = artifacts.require('SupplementWitholdingAccount');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('SupplementWitholdingAccount', accounts => {
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
    const initialSupply = web3.toBigNumber('1000000000000000000000');
    const granularity = web3.toBigNumber('10000000000000000');

    // Helper to confirm that balances are as expected
    async function confirmBalances() {
        for (var i = 0; i < expectedBalances.length; i++) {
            assert.equal((await erc777Instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10), 'Balance of account ' + i + ' is incorrect');
        }
        // Also confirm total supply
        assert.equal((await erc777Instance.totalSupply()).toString(), expectedBalances.reduce((a, b) => a.add(b), web3.toBigNumber('0')).toString(), 'Total supply is incorrect');
    }

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x991a1bcb077599290d7305493c9a630c20f8b798');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        expectedBalances[0] = initialSupply.mul(1);
        await confirmBalances();
    });

    it('creates the sender contract', async function() {
        instance = await SupplementWitholdingAccount.new({
            from: accounts[0]
        });
    });

    it('supplements tokens accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[0]
        });

        // Set up 15% witholding from accounts[0] to accounts[2]
        await instance.setSupplement(accounts[2], 1500);

        // Set up the sender contract as an operator for accounts[0]
        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[0]
        });

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], granularity.mul(100), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(15));
        expectedBalances[2] = expectedBalances[2].add(granularity.mul(15));
        await confirmBalances();

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[0]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[0]
        });
    });

    it('supplements odd-granularity values accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[0]
        });

        // Set up 15% witholding from accounts[0] to accounts[2]
        await instance.setSupplement(accounts[2], 1500);

        // Set up the sender contract as an operator for accounts[0]
        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[0]
        });

        // Transfer 10*granularity tokens from accounts[0] to accounts[1]
        await erc777Instance.send(accounts[1], granularity.mul(10), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(10));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(10));
        // Witholding should round up the 1.5 to 2 for granularity...
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(2));
        expectedBalances[2] = expectedBalances[2].add(granularity.mul(2));
        await confirmBalances();

        // Unregister the operator
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[0]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[0]
        });
    });

    it('cannot send without operator privileges', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[0]
        });

        // Set up 15% witholding from accounts[0] to accounts[2]
        await instance.setSupplement(accounts[2], 1500);

        // Transfer 100*granularity tokens from accounts[0] to accounts[1]
        try {
            await erc777Instance.send(accounts[1], granularity.mul(100), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[0]
        });
    });
});
