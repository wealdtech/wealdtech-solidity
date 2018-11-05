'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const OperatorAllowance = artifacts.require('OperatorAllowance');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('OperatorAllowance', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x820A8Cfd018b159837d50656c49d28983f18f33c');
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], 0, {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].add(initialSupply);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // accounts[1] is our test source address so send it some tokens
        const amount = granularity.mul(100);
        await erc777Instance.send(accounts[1], amount, '', {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the sender contract', async function() {
        instance = await OperatorAllowance.new({
            from: accounts[0]
        });
    });

    it('sets and resets allowances', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Set up an allowance of 10*granularity tokens
        const amount = granularity.mul(10);
        await instance.setAllowance(accounts[3], erc777Instance.address, 0, amount, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), amount.toString(10));

        // Change the allowance to 11*granularity tokens
        const newAmount = granularity.mul(11);
        await instance.setAllowance(accounts[3], erc777Instance.address, amount, newAmount, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), newAmount.toString(10));

        // Attempt to change the allowance with an incorrect current allowance
        await truffleAssert.reverts(
                instance.setAllowance(accounts[3], erc777Instance.address, granularity.mul(10), granularity.mul(20) , {
                    from: accounts[1]
                }), 'current allowance incorrect');

        // Reset the allowance to 0 tokens
        await instance.setAllowance(accounts[3], erc777Instance.address, newAmount, 0, {
            from: accounts[1]
        });
        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), 0);

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });

    it('handles allowances accordingly', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Set up an allowance of 10*granularity tokens
        const amount = granularity.mul(10);
        await instance.setAllowance(accounts[3], erc777Instance.address, 0, amount, {
            from: accounts[1]
        });

        assert.equal((await instance.getAllowance(accounts[1], accounts[3], erc777Instance.address)).toString(10), amount.toString(10));

        // Set up accounts[3] as an operator for accounts[1]
        await erc777Instance.authorizeOperator(accounts[3], {
            from: accounts[1]
        });

        // Operator transfer 5*granularity tokens from accounts[1] to accounts[2] 
        const transferAmount =granularity.mul(5);
        await erc777Instance.operatorSend(accounts[1], accounts[2], transferAmount, '', '', {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(transferAmount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(transferAmount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // Attempt to transfer 6*granularity tokens from accounts[1] to accounts[2] - should fail due to lack of allowance
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], granularity.mul(6), '', '', {
                    from: accounts[3]
                }), 'allowance too low');

        // Unregister the operator
        await erc777Instance.revokeOperator(accounts[3], {
            from: accounts[1]
        });

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });
});
