'use strict';

const assertRevert = require('../helpers/assertRevert.js');

const ERC777Token = artifacts.require('ERC777Token');
const DenyLowValueTokensRecipient = artifacts.require('DenyLowValueTokensRecipient');
const DenySpecifiedTokensSender = artifacts.require('DenySpecifiedTokensSender');
const AllowSpecifiedTokensRecipient = artifacts.require('AllowSpecifiedTokensRecipient');
const ERC820Registry = artifacts.require('ERC820Registry');

function pack(addr, value) {
    return '0x' + ('000000000000000000000000' + value.toString(16)).slice(-24) + addr.slice(2);
}

contract('ERC777Token', accounts => {
    var instance;
    var oldInstance;
    var erc820Instance;

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
            assert.equal((await instance.balanceOf(accounts[i])).toString(10), expectedBalances[i].toString(10), 'Balance of account ' + i + ' is incorrect');
        }
        // Also confirm total supply
        assert.equal((await instance.totalSupply()).toString(), expectedBalances.reduce((a, b) => a.add(b), web3.toBigNumber('0')).toString(), 'Total supply is incorrect');
    }

    it('sets up', async function() {
        erc820Instance = await ERC820Registry.at('0x991a1bcb077599290d7305493c9a630c20f8b798');
    });

    it('has an initial balance', async function() {
        instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, 0, {
            from: accounts[0],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[0]
        });
        expectedBalances[0] = initialSupply.mul(1);
        await confirmBalances();
    });

    it('can mint tokens', async function() {
        var tx = await instance.mint(accounts[1], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[1] = expectedBalances[1].add(granularity);
        await confirmBalances();
    });

    it('cannot mint sub-granularity tokens', async function() {
        try {
            await instance.mint(accounts[1], granularity.add(1), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('cannot mint tokens without permission', async function() {
        try {
            await instance.mint(accounts[1], granularity, "", {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('can disable minting', async function() {
        await instance.disableMinting({from: accounts[0]});
        try {
            await instance.mint(accounts[1], granularity, "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('can burn tokens', async function() {
        var tx = await instance.burn(granularity, "", {
            from: accounts[1]
        });
        expectedBalances[1] = expectedBalances[1].sub(granularity);
        await confirmBalances();
    });

    it('cannot burn sub-granularity tokens', async function() {
        try {
            await instance.burn(granularity.add(1), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('cannot burn more tokens than it owns', async function() {
        try {
            await instance.burn(expectedBalances[0].add(granularity), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('can send tokens', async function() {
        var tx = await instance.send(accounts[1], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[1] = expectedBalances[1].add(granularity);
        await confirmBalances();
    });

    it('cannot send sub-granularity amounts', async function() {
        try {
            await instance.send(accounts[1], granularity.add(1), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('cannot send more tokens than it owns', async function() {
        try {
            await instance.send(accounts[1], expectedBalances[0].add(granularity), "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('cannot send to an unregistered contract', async function() {
        // Create an arbitary contract
        var denyLowValueInstance = await DenyLowValueTokensRecipient.new({
            from: accounts[3]
        });

        // Try to send it some tokens
        try {
            await instance.send(denyLowValueInstance.address, granularity, "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('obeys a registered ERC777TokensRecipient', async function() {
        // Create the ITokenRecipient
        var recipientInstance = await DenyLowValueTokensRecipient.new({
            from: accounts[3]
        });

        // Register the recipient
        await erc820Instance.setInterfaceImplementer(accounts[3], web3.sha3("ERC777TokensRecipient"), recipientInstance.address, {
            from: accounts[3]
        });

        // Try sending a high-enough value so the recipient will allow it
        var tx = await instance.send(accounts[3], granularity.mul(1000), "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity.mul(1000));
        expectedBalances[3] = expectedBalances[3].add(granularity.mul(1000));
        await confirmBalances();

        // Try sending a too-low value so the recipient will reject it
        try {
            await instance.send(accounts[3], granularity, "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the recipient
        await erc820Instance.setInterfaceImplementer(accounts[3], web3.sha3("ERC777TokensRecipient"), 0, {
            from: accounts[3]
        });

        await confirmBalances();
    });

    it('handles a complex ERC777TokensRecipient', async function() {
        // Create the ITokenRecipient
        var recipientInstance = await AllowSpecifiedTokensRecipient.new({
            from: accounts[4]
        });

        // Register the recipient
        await erc820Instance.setInterfaceImplementer(accounts[4], web3.sha3("ERC777TokensRecipient"), recipientInstance.address, {
            from: accounts[4]
        });

        // Send; should fail as we have not allowed yet
        try {
            await instance.send(accounts[4], granularity, "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();

        // Now allow the contract to send the recipient tokens
        await recipientInstance.addToken(instance.address, {
            from: accounts[4]
        });

        // Send; should suceed
        await instance.send(accounts[4], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[4] = expectedBalances[4].add(granularity);
        await confirmBalances();

        // Unregister the recipient
        await erc820Instance.setInterfaceImplementer(accounts[4], web3.sha3("ERC777TokensRecipient"), 0, {
            from: accounts[4]
        });

        // Send; should succeed as we have unregistered
        await instance.send(accounts[4], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[4] = expectedBalances[4].add(granularity);
        await confirmBalances();
    });

    it('obeys a registered ERC777TokensSender', async function() {
        // Create the ERC777TokensSender
        var senderInstance = await DenySpecifiedTokensSender.new({
            from: accounts[0]
        });

        // Disallow sending to 2 from 0
        await senderInstance.addDenial(accounts[2], {
            from: accounts[0]
        });

        // Register the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), senderInstance.address, {
            from: accounts[0]
        });

        // Try sending to accounts[1]; should succeed
        var tx = await instance.send(accounts[1], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[1] = expectedBalances[1].add(granularity);
        await confirmBalances();

        // Try sending to accounts[2]; should fail
        try {
            await instance.send(accounts[2], granularity, "", {
                from: accounts[0]
            });
            // assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        // Unregister the sender
        await erc820Instance.setInterfaceImplementer(accounts[0], web3.sha3("ERC777TokensSender"), 0, {
            from: accounts[0]
        });

        await confirmBalances();
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
        try {
            await instance.authorizeOperator(accounts[0], {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('does not allow revocation of self as an operator', async function() {
        try {
            await instance.revokeOperator(accounts[0], {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
    });

    it('allows an operator to send on a another\'s behalf', async function() {
        // accounts[1] sends on behalf of accounts[0]; should fail
        try {
            await instance.operatorSend(accounts[0], accounts[2], granularity, "", "", {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();

        // Make accounts[1] an operator for accounts[0]
        await instance.authorizeOperator(accounts[1], {
            from: accounts[0]
        });
        
        // accounts[1] sends on behalf of accounts[0]; should succeed
        await instance.operatorSend(accounts[0], accounts[2], granularity, "user", "operator", {
            from: accounts[1]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[2] = expectedBalances[2].add(granularity);
        await confirmBalances();

        // Revoke accounts[1] as an operator for accounts[0]
        await instance.revokeOperator(accounts[1], {
            from: accounts[0]
        });

        // accounts[1] sends on behalf of accounts[0]; should fail
        try {
            await instance.operatorSend(accounts[0], accounts[2], granularity, "", "", {
                from: accounts[1]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }

        await confirmBalances();
    });

    it('can upgrade to a new contract', async function() {
        oldInstance = instance;
        instance = await ERC777Token.new(2, 'Test token', 'TST', await oldInstance.granularity(), await oldInstance.totalSupply(), await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await instance.activate({
            from: accounts[1]
        });
        // Ensure that the new instance has access to the store
        await confirmBalances();

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
        await confirmBalances();
        var tx = await instance.send(accounts[1], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[1] = expectedBalances[1].add(granularity);
        await confirmBalances();
    });

    it('cannot be accessed by an old contract', async function() {
        try {
            await oldInstance.send(accounts[1], granularity, "", {
                from: accounts[0]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });

    it('can upgrade again', async function() {
        oldInstance = instance;
        instance = await ERC777Token.new(3, 'Test token', 'TST', granularity, initialSupply, await oldInstance.store(), {
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
        await confirmBalances();
        await instance.send(accounts[1], granularity, "", {
            from: accounts[0]
        });
        expectedBalances[0] = expectedBalances[0].sub(granularity);
        expectedBalances[1] = expectedBalances[1].add(granularity);
        await confirmBalances();
    });

    it('cannot be upgraded by someone else', async function() {
        var fakeInstance = await ERC777Token.new(4, 'Test token', 'TST', granularity, initialSupply, await oldInstance.store(), {
            from: accounts[1],
            gas: 10000000
        });
        await fakeInstance.activate({
            from: accounts[1]
        });
        try {
            await instance.preUpgrade(fakeInstance.address, {
                from: accounts[3]
            });
            assert.fail();
        } catch (error) {
            assertRevert(error);
        }
        await confirmBalances();
    });
});
