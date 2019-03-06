'use strict';

const sha3 = require('solidity-sha3').default;
const truffleAssert = require('truffle-assertions');
const asserts = require('../helpers/asserts.js');
const erc1820 = require('../helpers/erc1820.js');

const ERC777Token = artifacts.require('ERC777Token');

contract('ERC777Token', accounts => {
    var instance;
    var oldInstance;

    const initialSupply = web3.utils.toBN('1000000000000000000000');
    const granularity = web3.utils.toBN('10000000000000000');

    let tokenBalances = {};

    it('confirms that ERC1820 is deployed', async function() {
        const erc1820Instance = await erc1820.instance();
        await erc1820Instance.setManager(accounts[0], accounts[1], {from: accounts[0]});
        const ac1 = await erc1820Instance.getManager(accounts[0]);
        assert.equal(ac1, accounts[1]);
        await erc1820Instance.setManager(accounts[0], '0x0000000000000000000000000000000000000000', {
            from: accounts[1]
        });
        const ac0 = await erc1820Instance.getManager(accounts[0]);
        assert.equal(ac0, accounts[0]);
        const hash = sha3("Test");
        await erc1820Instance.setInterfaceImplementer(accounts[0], hash, accounts[0]);
    });

    it('instantiates the token', async function() {
        instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[0],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[0]
        });
    });

    it('has an initial balance', async function() {
        tokenBalances[accounts[0]] = initialSupply.clone();
        tokenBalances[accounts[1]] = web3.utils.toBN('0');
        tokenBalances[accounts[2]] = web3.utils.toBN('0');
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('can mint tokens', async function() {
        await instance.mint(accounts[1], granularity, [], [], {
            from: accounts[0]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('cannot mint sub-granularity tokens', async function() {
        await truffleAssert.reverts(
                instance.mint(accounts[1], granularity.add(web3.utils.toBN('1')), [], [], {
                    from: accounts[0]
                }), 'amount must be a multiple of granularity');
    });

    it('cannot mint tokens without permission', async function() {
        await truffleAssert.reverts(
                instance.mint(accounts[1], granularity, [], [], {
                    from: accounts[1]
                }));
    });

    it('can disable minting', async function() {
        await instance.disableMinting({from: accounts[0]});
        await truffleAssert.reverts(
                instance.mint(accounts[1], granularity, [], [], {
                    from: accounts[0]
                }), 'minting disabled');
    });

    it('can burn tokens', async function() {
        await instance.burn(granularity, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('cannot burn sub-granularity tokens', async function() {
        await truffleAssert.reverts(
                instance.burn(granularity.add(web3.utils.toBN('1')), [], {
                    from: accounts[0]
                }), 'amount must be a multiple of granularity');
    });

    it('cannot burn more tokens than it owns', async function() {
        await truffleAssert.reverts(
                instance.burn(tokenBalances[accounts[0]].add(granularity), [], {
                    from: accounts[0]
                }), 'not enough tokens in holder\'s account');
    });

    it('can send tokens', async function() {
        await instance.send(accounts[1], granularity, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(granularity);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('cannot send sub-granularity amounts', async function() {
        await truffleAssert.reverts(
                instance.send(accounts[1], granularity.add(web3.utils.toBN('1')), [], {
                    from: accounts[0]
                }), 'amount must be a multiple of granularity');
    });

    it('cannot send more tokens than it owns', async function() {
        await truffleAssert.reverts(
                instance.send(accounts[1], tokenBalances[accounts[0]].add(granularity), [], {
                    from: accounts[0]
                }), 'not enough tokens in holder\'s account');
    });

    it('cannot send to an unregistered contract', async function() {
        // Create an arbitary contract
        var contract = await ERC777Token.new(1, 'Any contract', 'ANY', granularity, initialSupply, [], '0x0000000000000000000000000000000000000000', {
            from: accounts[3],
            gas: 10000000
        });

        // Try to send it some tokens
        await truffleAssert.reverts(
                instance.send(contract.address, granularity, [], {
                    from: accounts[0]
                }), 'cannot send tokens to contract that does not explicitly receive them');
    });

    it('carries out authorization of an operator', async function() {
        // Ensure that accounts[1] is not an operator for accounts[0]
        assert.equal(await instance.isOperatorFor(accounts[1], accounts[0]), false);

        // Make accounts[1] an operator for accounts[0]
        await instance.authorizeOperator(accounts[1], {
            from: accounts[0]
        });

        // Ensure that accounts[1] is an operator for accounts[0]
        assert.equal(await instance.isOperatorFor(accounts[1], accounts[0]), true);

        // Remove accounts[1] as an operator for accounts[0]
        await instance.revokeOperator(accounts[1], {
            from: accounts[0]
        });

        // Ensure that accounts[1] is no longer an operator for accounts[0]
        assert.equal(await instance.isOperatorFor(accounts[1], accounts[0]), false);
    });

    it('does not allow authorization of self as an operator', async function() {
        await truffleAssert.reverts(
                instance.authorizeOperator(accounts[0], {
                    from: accounts[0]
                }), 'not allowed to set yourself as an operator');
    });

    it('does not allow revocation of self as an operator', async function() {
        await truffleAssert.reverts(
                instance.revokeOperator(accounts[0], {
                    from: accounts[0]
                }), 'not allowed to remove yourself as an operator');
    });

    it('recognises default operators', async function() {
        const operator1 = accounts[8];
        const operator2 = accounts[9];
        const operators = [operator1, operator2]

        // Create an instance with default operators
        const instance = await ERC777Token.new(1, 'Default operators', 'DFT', granularity, initialSupply, operators, '0x0000000000000000000000000000000000000000', {
            from: accounts[1],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[1]
        });

        // Ensure that operator1 is an operator for all accounts
        for (var i = 0; i < 8; i++) {
            assert.equal(await instance.isOperatorFor(operator1, accounts[i]), true);
            assert.equal(await instance.isOperatorFor(operator2, accounts[i]), true);
        }

        // Revoke operator1 as an operator for accounts[0]
        await instance.revokeOperator(operator1, {
            from: accounts[0]
        });
        assert.equal(await instance.isOperatorFor(operator1, accounts[0]), false);
        assert.equal(await instance.isOperatorFor(operator2, accounts[0]), true);
        assert.equal(await instance.isOperatorFor(operator1, accounts[1]), true);

        // Reinstate operator1 as an operator for accounts[0]
        await instance.authorizeOperator(operator1, {
            from: accounts[0]
        });
        assert.equal(await instance.isOperatorFor(operator1, accounts[0]), true);
        assert.equal(await instance.isOperatorFor(operator2, accounts[0]), true);
        assert.equal(await instance.isOperatorFor(operator1, accounts[1]), true);
    });

    it('allows an operator to send on another\'s behalf', async function() {
        // accounts[1] sends on behalf of accounts[0]; should fail
        await truffleAssert.reverts(
                instance.operatorSend(accounts[0], accounts[2], granularity, [], [], {
                    from: accounts[1]
                }), 'not allowed to send');

        // Make accounts[1] an operator for accounts[0]
        await instance.authorizeOperator(accounts[1], {
            from: accounts[0]
        });
        
        // accounts[1] sends on behalf of accounts[0]; should succeed
        await instance.operatorSend(accounts[0], accounts[2], granularity, [], [], {
            from: accounts[1]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(granularity);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);

        // Revoke accounts[1] as an operator for accounts[0]
        await instance.revokeOperator(accounts[1], {
            from: accounts[0]
        });

        // accounts[1] sends on behalf of accounts[0]; should fail
        await truffleAssert.reverts(
                instance.operatorSend(accounts[0], accounts[2], granularity, [], [], {
                    from: accounts[1]
                }), 'not allowed to send');
    });

    it('can upgrade to a new contract', async function() {
        oldInstance = instance;
        instance = await ERC777Token.new(2, 'Test token', 'TST', await oldInstance.granularity(), await oldInstance.totalSupply(), [], await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[1]
        });

        // Ensure that the new instance has access to the store
        await asserts.assertTokenBalances(instance, tokenBalances);

        // Carry out the upgrade
        await oldInstance.preUpgrade(instance.address, {
            from: accounts[0]
        });
        await oldInstance.upgrade({
            from: accounts[0]
        });
        await oldInstance.commitUpgrade({
            from: accounts[0]
        });

        // Ensure the new contract can carry out transfers
        await asserts.assertTokenBalances(instance, tokenBalances);
        await instance.send(accounts[1], granularity, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(granularity);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('cannot be accessed by an old contract', async function() {
        await truffleAssert.reverts(
                oldInstance.send(accounts[1], granularity, [], {
                    from: accounts[0]
                }));
    });

    it('can upgrade again', async function() {
        oldInstance = instance;
        instance = await ERC777Token.new(3, 'Test token', 'TST', granularity, initialSupply, [], await oldInstance.store(), {
            from: accounts[2],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[2]
        });

        // Carry out the upgrade
        await oldInstance.preUpgrade(instance.address, {
            from: accounts[1]
        });
        await oldInstance.upgrade({
            from: accounts[1]
        });
        await oldInstance.commitUpgrade({
            from: accounts[1]
        });

        // Ensure the new contract can carry out transfers
        await asserts.assertTokenBalances(instance, tokenBalances);
        await instance.send(accounts[1], granularity, [], {
            from: accounts[0]
        });
        tokenBalances[accounts[0]] = tokenBalances[accounts[0]].sub(granularity);
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].add(granularity);
        await asserts.assertTokenBalances(instance, tokenBalances);
    });

    it('cannot be upgraded by someone else', async function() {
        var fakeInstance = await ERC777Token.new(4, 'Test token', 'TST', granularity, initialSupply, [], await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await fakeInstance.activate({
            from: accounts[1]
        });
        await asserts.assertTokenBalances(instance, tokenBalances);
        await truffleAssert.reverts(
                instance.preUpgrade(fakeInstance.address, {
                    from: accounts[3]
                }));
    });
});
