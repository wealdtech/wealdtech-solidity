'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const SignatureAuthority = artifacts.require('SignatureAuthority');
const ERC820Registry = artifacts.require('ERC820Registry');

contract('SignatureAuthority', accounts => {
    var erc777Instance;
    var operator;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].add(initialSupply);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        // accounts[1] is our test source address so send it some tokens
        const amount = granularity.mul(web3.utils.toBN('100'));
        await erc777Instance.send(accounts[1], amount, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(amount);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('creates the signature authority operator contract', async function() {
        operator = await SignatureAuthority.new({
            from: accounts[0]
        });
    });

    it('does not transfer when not set up', async function() {
        const amount = granularity.mul(web3.utils.toBN('5'));
        const hash = await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], amount, [], 1);
        const signature = await web3.eth.sign(hash, accounts[1]);

        // Attempt to transfer tokens as accounts[9] from accounts[1] to accounts[2]
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 1, signature, {
                    from: accounts[9]
                }), 'not allowed to send');
    });

    it('transfers when set up', async function() {
        const amount = granularity.mul(web3.utils.toBN('5'));
        const hash = await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], amount, [], 1);
        const signature = await web3.eth.sign(hash, accounts[1]);

        // Set up the contract as an operator for accounts[1]
        await erc777Instance.authorizeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), true);

        // Transfer tokens as accounts[9] from accounts[1] to accounts[2]
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 1, signature, {
            from: accounts[9]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not allow the same transfer twice', async function() {
        const amount = granularity.mul(web3.utils.toBN('5'));
        const hash = await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], amount, [], 1);
        const signature = await web3.eth.sign(hash, accounts[1]);

        // Attempt to transfer tokens again - should fail as the parameters are the same as a previous transaction
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 1, signature, {
                    from: accounts[9]
                }), 'tokens already sent');
    });

    it('transfers with different data', async function() {
        const amount = granularity.mul(web3.utils.toBN('5'));
        // New nonce
        const hash = await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], amount, [], 2);
        const signature = await web3.eth.sign(hash, accounts[1]);

        // Transfer tokens as accounts[9] from accounts[1] to accounts[2]
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 2, signature, {
            from: accounts[9]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not work when de-registered', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);

        const amount = granularity.mul(web3.utils.toBN('5'));
        const hash = await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], amount, [], 3);
        const signature = await web3.eth.sign(hash, accounts[1]);

        // Attempt to transfer tokens - should fail as deregistered
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 3, signature, {
                    from: accounts[9]
                }), 'not allowed to send');
    });
});
