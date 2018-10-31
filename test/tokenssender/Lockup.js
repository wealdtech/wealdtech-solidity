'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const Lockup = artifacts.require('Lockup');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;
const currentOffset = () => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [0], id: 0 })
const increaseTime = addSeconds => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [addSeconds], id: 0 })
const mine = () => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 })

contract('Lockup', accounts => {
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
    });

    it('creates the sender contract', async function() {
        instance = await Lockup.new({
            from: accounts[0]
        });
        // accounts[1] is our test source address so send it some tokens
        await erc777Instance.send(accounts[1], granularity.mul(100), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(100));
        expectedBalances[1] = expectedBalances[1].add(granularity.mul(100));
        await confirmBalances();

        // Expiry is set to 1 minute from the current time
        const now = Math.round(new Date().getTime() / 1000) + currentOffset().result;
        const expiry = now + 60;
        await instance.setExpiry(erc777Instance.address, expiry, {
            from: accounts[1]
        });
    });

    it('sets up the operator', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[1]
        });

        // Set up everyone as an operator for accounts[1]
        await erc777Instance.authorizeOperator('0xffffffffffffffffffffffffffffffffffffffff', {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[2], accounts[1]), true);
    });

    it('sets allowances', async function() {
        const allowance = granularity.mul(10);
        await instance.setAllowance(erc777Instance.address, accounts[2], allowance, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(erc777Instance.address, accounts[1], accounts[2])).toString(), allowance.toString());
        await instance.setAllowance(erc777Instance.address, accounts[3], allowance, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(erc777Instance.address, accounts[1], accounts[3])).toString(), allowance.toString());
        await instance.setAllowance(erc777Instance.address, accounts[4], allowance, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(erc777Instance.address, accounts[1], accounts[4])).toString(), allowance.toString());
    });

    it('does not transfer before the lockup expires', async function() {
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[2], granularity.mul(10), "", "", {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('transfers after the lockup expires', async function() {
        // Expiry is 1 minute so go past that
        increaseTime(61);
        mine();

        const tokens = granularity.mul(10);
        await erc777Instance.operatorSend(accounts[1], accounts[2], tokens, "", "", {
            from: accounts[2]
        });
        expectedBalances[1] = expectedBalances[1].sub(tokens);
        expectedBalances[2] = expectedBalances[2].add(tokens);
        await confirmBalances();
    });

    it('does not transfer more than the allowance', async function() {
        const tokens = granularity.mul(105);
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], tokens, "", "", {
                from: accounts[3]
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
        // Transfer tokens as accounts[3] from accounts[1] to accounts[3]
        const tokens = granularity.mul(5);

        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], tokens, "", "", {
                from: accounts[3]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });
});
