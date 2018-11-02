'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const FixedAllowance = artifacts.require('FixedAllowance');

const sha3 = require('solidity-sha3').default;

contract('FixedAllowance', accounts => {
    var erc777Instance;
    var operator;

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
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        expectedBalances[0] = initialSupply.mul(1);
        await confirmBalances();

        // accounts[1] is our test source address so send it some tokens
        await erc777Instance.send(accounts[1], granularity.mul(100), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        await confirmBalances();
    });

    it('creates the operator contract', async function() {
        operator = await FixedAllowance.new({
            from: accounts[0]
        });
    });

    it('does not send when not set up', async function() {
        const amount = granularity.mul(5);

        await operator.setAllowance(erc777Instance.address, accounts[2], 0, granularity.mul(100), {
            from: accounts[1]
        });

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3]
        try {
            await operator.send(erc777Instance.address, accounts[1], accounts[3], amount, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error, 'not allowed to send');
        }

        await operator.setAllowance(erc777Instance.address, accounts[2], granularity.mul(100), 0, {
            from: accounts[1]
        });
    });

    it('does not transfer without an allowance', async function() {
        // Set up the contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), true);

        const amount = granularity.mul(5);
        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3]
        try {
            await operator.send(erc777Instance.address, accounts[1], accounts[3], amount, {
                from: accounts[3]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error, 'amount exceeds allowance');
        }
    });

    it('transfers when set up', async function() {
        // Set up an allowance for accounts[2]
        await operator.setAllowance(erc777Instance.address, accounts[2], 0, granularity.mul(100), {
            from: accounts[1]
        });

        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        const amount = granularity.mul(5);
        await operator.send(erc777Instance.address, accounts[1], accounts[3], amount, {
            from: accounts[2]
        });
        expectedBalances[1] = expectedBalances[1].sub(amount);
        expectedBalances[3] = expectedBalances[3].add(amount);
        await confirmBalances();
    });

    it('does not transfer more than allowed', async function() {
        const amount = granularity.mul(100);
        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3]
        try {
            await operator.send(erc777Instance.address, accounts[1], accounts[3], amount, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error, 'amount exceeds allowance');
        }
    });

    it('does not work when de-registered', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);

        const amount = granularity.mul(5);
        // Attempt to transfer tokens - should fail as deregistered
        try {
            await operator.send(erc777Instance.address, accounts[1], accounts[3], amount, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error, 'not allowed to send');
        }
    });
});
