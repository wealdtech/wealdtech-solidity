'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const Payed = artifacts.require('Payed');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;

contract('Payed', accounts => {
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
        erc820Instance = await ERC820Registry.at('0x820A8Cfd018b159837d50656c49d28983f18f33c');
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

    it('creates the sender contract', async function() {
        instance = await Payed.new({
            from: accounts[0]
        });
        await instance.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});
    });

    it('sets up the operator', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[1]
        });

        // Set up everyone as an operator for accounts[2]
        await erc777Instance.authorizeOperator('0xffffffffffffffffffffffffffffffffffffffff', {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[2], accounts[1]), true);
    });

    it('transfers when paid', async function() {
        const accounts1OldBalance = await web3.eth.getBalance(accounts[1]);

        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);
        // value is 1 wei per token
        const value = web3.toWei(tokens.toString(), 'wei');
        await erc777Instance.operatorSend(accounts[1], accounts[3], tokens, "", "", {
            from: accounts[2],
            value: value
        });
        expectedBalances[1] = expectedBalances[1].sub(tokens);
        expectedBalances[3] = expectedBalances[3].add(tokens);
        await confirmBalances();

        const accounts1NewBalance = await web3.eth.getBalance(accounts[1]);
        const accounts1ExpectedBalance = accounts1OldBalance.plus(value);
        assert.equal(accounts1NewBalance.toString(), accounts1ExpectedBalance.toString());
    });

    it('does not transfer when not paid', async function() {
        // Transfer tokens as accounts[1] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);
        // value is not enough...
        const value = web3.toWei(1, 'wei');
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], tokens, "", "", {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('de-registers', async function() {
        await erc777Instance.revokeOperator('0xffffffffffffffffffffffffffffffffffffffff', {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[2], accounts[1]), false);
    });

    it('does not work when de-registered', async function() {
        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);
        // value is 1 wei per token
        const value = web3.toWei(tokens.toString(), 'wei');

        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], tokens, "", "", {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });
});
