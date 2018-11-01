'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const FixedPriceSeller = artifacts.require('FixedPriceSeller');

const sha3 = require('solidity-sha3').default;

contract('FixedPriceSeller', accounts => {
    var erc777Instance;
    var instance;

    let expectedBalances = [
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
        instance = await FixedPriceSeller.new({
            from: accounts[9]
        });
    });

    it('sets up the operator for accounts[1]', async function() {
        await instance.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});

        await erc777Instance.authorizeOperator(instance.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(instance.address, accounts[1]), true);
    });

    it('sells tokens', async function() {
        const accounts1OldBalance = await web3.eth.getBalance(accounts[1]);

        const tokens = granularity.mul(5);
        // value is 1 wei per token
        const value = web3.toWei(tokens.toString(), 'wei');
        await instance.sell(erc777Instance.address, accounts[1], {
            from: accounts[2],
            value: value
        });
        expectedBalances[1] = expectedBalances[1].sub(tokens);
        expectedBalances[2] = expectedBalances[2].add(tokens);
        await confirmBalances();

        const accounts1NewBalance = await web3.eth.getBalance(accounts[1]);
        const accounts1ExpectedBalance = accounts1OldBalance.plus(value);
        assert.equal(accounts1NewBalance.toString(), accounts1ExpectedBalance.toString());
    });

    it('does not sell when a cost is not set', async function() {
        await instance.setCostPerToken(erc777Instance.address, 0, {
			from: accounts[1]
		});

        const tokens = granularity.mul(5);
        const value = web3.toWei(tokens.toString(), 'wei');
        try {
            await instance.sell(erc777Instance.address, accounts[1], {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        await instance.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});

    });

    it('does not sell when not paid', async function() {
        // Transfer tokens as accounts[1] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);
        // value is not enough...
        const value = web3.toWei(1, 'wei');
        try {
            await instance.sell(erc777Instance.address, accounts[1], {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('de-registers', async function() {
        await erc777Instance.revokeOperator(instance.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(instance.address, accounts[1]), false);
    });

    it('does not work when de-registered', async function() {
        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);
        // value is 1 wei per token
        const value = web3.toWei(tokens.toString(), 'wei');

        try {
            await instance.sell(erc777Instance.address, accounts[1], {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });
});
