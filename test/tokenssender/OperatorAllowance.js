'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const OperatorAllowance = artifacts.require('OperatorAllowance');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('OperatorAllowance', accounts => {
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
        instance = await OperatorAllowance.new({
            from: accounts[0]
        });
    });

    it('sets and resets allowances', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[1]
        });

        // Set up an allowance of 10*granularity tokens
        await instance.setAllowance(accounts[3], erc777Instance.address, 0, granularity.mul(10), {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), granularity.mul(10).toString(10));

        // Change the allowance to 11*granularity tokens
        await instance.setAllowance(accounts[3], erc777Instance.address, granularity.mul(10), granularity.mul(11), {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), granularity.mul(11).toString(10));

        // Attempt to change the allowance with an incorrect current allowance
        try {
            await instance.setAllowance(accounts[3], erc777Instance.address, granularity.mul(10), granularity.mul(20), {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Reset the allowance to 0 tokens
        await instance.setAllowance(accounts[3], erc777Instance.address, granularity.mul(11), 0, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), 0);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[1]
        });
    });

    it('handles allowances accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), instance.address, {
            from: accounts[1]
        });

        // Set up an allowance of 10*granularity tokens
        await instance.setAllowance(accounts[3], erc777Instance.address, 0, granularity.mul(10), {
            from: accounts[1]
        });

        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), granularity.mul(10).toString(10));

        // Set up accounts[3] as an operator for accounts[1]
        await erc777Instance.authorizeOperator(accounts[3], {
            from: accounts[1]
        });

        // Operator transfer 5*granularity tokens from accounts[1] to accounts[2] 
        await erc777Instance.operatorSend(accounts[1], accounts[2], granularity.mul(5), "", "", {
            from: accounts[3]
        });
        expectedBalances[1] = expectedBalances[1].sub(granularity.mul(5));
        expectedBalances[2] = expectedBalances[2].add(granularity.mul(5));
        await confirmBalances();

        // Attempt to transfer 6*granularity tokens from accounts[1] to accounts[2] - should fail due to lack of allowance
        try {
            await erc777Instance.operatorSend(accounts[1], accounts[2], granularity.mul(6), "", "", {
                from: accounts[3]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the operator
        await erc777Instance.revokeOperator(accounts[3], {
            from: accounts[1]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[1]
        });
    });
});
