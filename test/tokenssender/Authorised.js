'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const Authorised = artifacts.require('Authorised');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;

contract('Authorised', accounts => {
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
        instance = await Authorised.new({
            from: accounts[0]
        });
    });

    it('does not transfer when not set up', async function() {
        // Create the operator data, which is the signature
        const value = web3.toWei('2', 'ether');
        const hash = await instance.hashForSend(accounts[2], granularity.mul(5), value, "");
        const operatorData = await web3.eth.sign(accounts[1], hash);

        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[1]
        });

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3]
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], granularity.mul(5), "", operatorData, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('transfers when set up', async function() {
        // Create the operator data, which is the signature
        const value = web3.toWei('2', 'ether');
        const hash = await instance.hashForSend(accounts[2], granularity.mul(5), value, "");
        const operatorData = await web3.eth.sign(accounts[1], hash);

        // Set up everyone as an operator for accounts[1]
        await erc777Instance.authorizeOperator('0xffffffffffffffffffffffffffffffffffffffff', {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[2], accounts[1]), true);

        const accounts1OldBalance = await web3.eth.getBalance(accounts[1]);

        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        await erc777Instance.operatorSend(accounts[1], accounts[3], granularity.mul(5), "", operatorData, {
            from: accounts[2],
            value: value
        });
        expectedBalances[1] = expectedBalances[1].sub(granularity.mul(5));
        expectedBalances[3] = expectedBalances[3].add(granularity.mul(5));
        await confirmBalances();

        const accounts1NewBalance = await web3.eth.getBalance(accounts[1]);
        const accounts1ExpectedBalance = accounts1OldBalance.plus(web3.toWei(2, 'ether'));
        assert.equal(accounts1NewBalance.toString(), accounts1ExpectedBalance.toString());
    });

    it('does not allow the same transfer twice', async function() {
        // Create the operator data, which is the signature
        const value = web3.toWei('2', 'ether');
        const hash = await instance.hashForSend(accounts[2], granularity.mul(5), value, "");
        const operatorData = await web3.eth.sign(accounts[1], hash);

        // Attempt to transfer tokens again - should fail as the parameters are the same as a previous transaction
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], granularity.mul(5), "", operatorData, {
                from: accounts[2],
                value: value
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('transfers with different data', async function() {
        // Create the operator data, which is the signature
        const value = web3.toWei('2', 'ether');
        const hash = await instance.hashForSend(accounts[2], granularity.mul(5), value, "data");
        const operatorData = await web3.eth.sign(accounts[1], hash);

        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        await erc777Instance.operatorSend(accounts[1], accounts[3], granularity.mul(5), "data", operatorData, {
            from: accounts[2],
            value: value
        });
        expectedBalances[1] = expectedBalances[1].sub(granularity.mul(5));
        expectedBalances[3] = expectedBalances[3].add(granularity.mul(5));
        await confirmBalances();
    });

    it('does not work when de-registered', async function() {
        // Create the operator data, which is the signature
        const value = web3.toWei('2', 'ether');
        const hash = await instance.hashForSend(accounts[2], granularity.mul(5), value, "");
        const operatorData = await web3.eth.sign(accounts[1], hash);

        await erc777Instance.revokeOperator('0xffffffffffffffffffffffffffffffffffffffff', {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[2], accounts[1]), false);

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3]
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[3], granularity.mul(5), "", operatorData, {
                from: accounts[2]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });
});
