'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const CounterSignature = artifacts.require('CounterSignature');
const ERC820Registry = artifacts.require('ERC820Registry');

const sha3 = require('solidity-sha3').default;

contract('CounterSignature', accounts => {
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
        instance = await CounterSignature.new({
            from: accounts[0]
        });
    });

    it('sets up the operator', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), instance.address, {
            from: accounts[1]
        });

        // Make accounts[3] and operator for accounts[1]
        await erc777Instance.authorizeOperator(accounts[3], {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(accounts[3], accounts[1]), true);
    });

    it('does not transfer without the countersignatory set', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(5), '');
        const operatorData = await web3.eth.sign(accounts[4], hash);

        const amount = granularity.mul(5);
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', operatorData, {
                    from: accounts[3]
                }), 'signatory is not a valid countersignatory');
    });

    it('transfers when set up', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(5), '');
        const operatorData = await web3.eth.sign(accounts[4], hash);

        // Set up accounts[4] as a counter-signatory for accounts[1]
        await instance.setCounterSignatory(accounts[4], {
            from: accounts[1]
        });
        assert.equal(await instance.getCounterSignatory(accounts[1]), accounts[4]);

        // Transfer tokens as accounts[3] from accounts[1] to accounts[3]
        const amount = granularity.mul(5);
        await erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', operatorData, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

    });

    it('does not allow the same transfer twice', async function() {
        // Create the operator data, which is the counter-signature.  Same as the last test
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(5), '');
        const operatorData = await web3.eth.sign(accounts[4], hash);

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3] - should fail as the values are the same as
        // a previous successful transfer
        const amount = granularity.mul(5);
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, '', operatorData, {
                    from: accounts[3]
                }), 'tokens already sent');
    });

    it('transfers with new data', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(5), 'new');
        const operatorData = await web3.eth.sign(accounts[4], hash);

        // Transfer tokens as accounts[3] from accounts[1] to accounts[2]
        const amount = granularity.mul(5);
        await erc777Instance.operatorSend(accounts[1], accounts[2], amount, 'new', operatorData, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('recognises deregistration of counter-signatories', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(5), 'newer');
        const operatorData = await web3.eth.sign(accounts[4], hash);

        // Remove accounts[4] as a counter-signatory for accounts[1]
        await instance.clearCounterSignatory({
            from: accounts[1]
        });
        assert.equal(await instance.getCounterSignatory(accounts[1]), 0);

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3] - should fail
        const amount = granularity.mul(5);
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, 'newer', operatorData, {
                    from: accounts[3]
                }), 'signatory is not a valid countersignatory');

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.sha3('ERC777TokensSender'), 0, {
            from: accounts[1]
        });
    });
});
