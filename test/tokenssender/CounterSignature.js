'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const CounterSignature = artifacts.require('CounterSignature');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;

contract('CounterSignature', accounts => {
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
        instance = await CounterSignature.new({
            from: accounts[0]
        });
    });

    it('handles senders accordingly', async function() {
        // Create the counter-signature
        const nonce = sha3("testnonce1");
        const hash = await instance.hashForCounterSignature(accounts[1], accounts[0], accounts[2], granularity.mul(5), nonce);
        const counterSignature = await web3.eth.sign(accounts[3], hash);

        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[0]
        });

        // Attempt to transfer tokens as accounts[1] from accounts[0] to accounts[2] - should fail
        try {
            await erc777Instance.operatorSend(accounts[0], accounts[2], granularity.mul(5), nonce, counterSignature, {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Set up accounts[1] as an operator for accounts[0]
        await erc777Instance.authorizeOperator(accounts[1], {
            from: accounts[0]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[1], accounts[0]), true);

        // Attempt to transfer tokens as accounts[1] from accounts[0] to accounts[2] - should fail
        try {
            await erc777Instance.operatorSend(accounts[0], accounts[2], granularity.mul(5), nonce, counterSignature, {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Set up accounts[3] as a counter-signatory for accounts[0]
        await instance.setCounterSignatory(accounts[3], {
            from: accounts[0]
        });
        assert.equal(await instance.getCounterSignatory(accounts[0]), accounts[3]);

        // Transfer tokens as accounts[1] from accounts[0] to accounts[2]
        await erc777Instance.operatorSend(accounts[0], accounts[2], granularity.mul(5), nonce, counterSignature, {
            from: accounts[1]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(5));
        expectedBalances[2] = expectedBalances[2].add(granularity.mul(5));
        await confirmBalances();

        // Remove accounts[3] as a counter-signatory for accounts[0]
        await instance.clearCounterSignatory({
            from: accounts[0]
        });
        assert.equal(await instance.getCounterSignatory(accounts[0]), 0);

        // Attempt to transfer tokens as accounts[1] from accounts[0] to accounts[2] - should fail
        try {
            await erc777Instance.operatorSend(accounts[0], accounts[2], granularity.mul(5), nonce, counterSignature, {
                from: accounts[1]
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
