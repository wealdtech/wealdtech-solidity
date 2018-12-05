'use strict';

const asserts = require('../helpers/asserts.js');
const erc820 = require('../helpers/erc820.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const CounterSignature = artifacts.require('CounterSignature');

contract('CounterSignature', accounts => {
    var erc777Instance;
    var erc820Instance;
    var instance;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

    it('sets up', async function() {
        erc820Instance = await erc820.instance();
        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await erc777Instance.activate({
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = initialSupply.clone();
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

    it('creates the sender contract', async function() {
        instance = await CounterSignature.new({
            from: accounts[0]
        });
    });

    it('sets up the operator', async function() {
        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), instance.address, {
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
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), []);
        const operatorData = await web3.eth.sign(hash, accounts[4]);

        const amount = granularity.mul(web3.utils.toBN('5'));
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, [], operatorData, {
                    from: accounts[3]
                }), 'signatory is not a valid countersignatory');
    });

    it('transfers when set up', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), []);
        const operatorData = await web3.eth.sign(hash, accounts[4]);

        // Set up accounts[4] as a counter-signatory for accounts[1]
        await instance.setCounterSignatory(accounts[4], {
            from: accounts[1]
        });
        assert.equal(await instance.getCounterSignatory(accounts[1]), accounts[4]);

        // Transfer tokens as accounts[3] from accounts[1] to accounts[3]
        const amount = granularity.mul(web3.utils.toBN('5'));
        await erc777Instance.operatorSend(accounts[1], accounts[2], amount, [], operatorData, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

    });

    it('does not allow the same transfer twice', async function() {
        // Create the operator data, which is the counter-signature.  Same as the last test
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), []);
        const operatorData = await web3.eth.sign(hash, accounts[4]);

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3] - should fail as the values are the same as
        // a previous successful transfer
        const amount = granularity.mul(web3.utils.toBN('5'));
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, [], operatorData, {
                    from: accounts[3]
                }), 'tokens already sent');
    });

    it('transfers with new data', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), '0x01');
        const operatorData = await web3.eth.sign(hash, accounts[4]);

        // Transfer tokens as accounts[3] from accounts[1] to accounts[2]
        const amount = granularity.mul(web3.utils.toBN('5'));
        await erc777Instance.operatorSend(accounts[1], accounts[2], amount, '0x01', operatorData, {
            from: accounts[3]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('recognises deregistration of counter-signatories', async function() {
        // Create the operator data, which is the counter-signature
        const hash = await instance.hashForCounterSignature(erc777Instance.address, accounts[3], accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), '0x02');
        const operatorData = await web3.eth.sign(hash, accounts[4]);

        // Remove accounts[4] as a counter-signatory for accounts[1]
        await instance.clearCounterSignatory({
            from: accounts[1]
        });
        assert.equal(await instance.getCounterSignatory(accounts[1]), 0);

        // Attempt to transfer tokens as accounts[2] from accounts[1] to accounts[3] - should fail
        const amount = granularity.mul(web3.utils.toBN('5'));
        await truffleAssert.reverts(
                erc777Instance.operatorSend(accounts[1], accounts[2], amount, '0x02', operatorData, {
                    from: accounts[3]
                }), 'signatory is not a valid countersignatory');

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[1], web3.utils.soliditySha3('ERC777TokensSender'), '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
    });
});
