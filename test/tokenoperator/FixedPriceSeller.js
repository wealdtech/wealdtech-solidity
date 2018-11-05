'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');

const ERC777Token = artifacts.require('ERC777Token');
const FixedPriceSeller = artifacts.require('FixedPriceSeller');

contract('FixedPriceSeller', accounts => {
    var erc777Instance;
    var operator;

    const granularity = web3.toBigNumber('10000000000000000');
    const initialSupply = granularity.mul('10000000');

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.toBigNumber(0);
    tokenBalances[accounts[1]] = web3.toBigNumber(0);
    tokenBalances[accounts[2]] = web3.toBigNumber(0);

    it('sets up', async function() {
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

    it('creates the operator contract', async function() {
        operator = await FixedPriceSeller.new({
            from: accounts[9]
        });
    });

    it('sets up the operator for accounts[1]', async function() {
        await operator.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});

        await erc777Instance.authorizeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), true);
    });

    it('sells tokens', async function() {
        const accounts1OldBalance = await web3.eth.getBalance(accounts[1]);

        const amount = granularity.mul(5);
        // value is 1 wei per token
        const value = web3.toWei(amount.toString(), 'wei');
        await operator.sell(erc777Instance.address, accounts[1], {
            from: accounts[2],
            value: value
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);

        const accounts1NewBalance = await web3.eth.getBalance(accounts[1]);
        const accounts1ExpectedBalance = accounts1OldBalance.plus(value);
        assert.equal(accounts1NewBalance.toString(), accounts1ExpectedBalance.toString());
    });

    it('does not sell when a cost is not set', async function() {
        await operator.setCostPerToken(erc777Instance.address, 0, {
			from: accounts[1]
		});

        const amount = granularity.mul(5);
        const value = web3.toWei(amount.toString(), 'wei');
        await truffleAssert.reverts(
                operator.sell(erc777Instance.address, accounts[1], {
                    from: accounts[2],
                    value: value
                }), 'not for sale');

        await operator.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});
    });

    it('does not sell when not paid', async function() {
        await truffleAssert.reverts(
                operator.sell(erc777Instance.address, accounts[1], {
                    from: accounts[2]
                }), 'not enough ether paid');
    });

    it('does not sell when incorrect value passed', async function() {
        await operator.setCostPerToken(erc777Instance.address, web3.toWei(2, 'wei'), {
			from: accounts[1]
		});
        // Transfer 2.5 tokens as accounts[1] from accounts[1] to accounts[3]
        // value is not enough...
        const value = web3.toWei(1, 'wei');
        await truffleAssert.reverts(
                operator.sell(erc777Instance.address, accounts[1], {
                    from: accounts[2],
                    value: value
                }), 'not enough ether paid');
        await operator.setCostPerToken(erc777Instance.address, web3.toWei(1, 'wei'), {
			from: accounts[1]
		});
    });

    it('de-registers', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);
    });

    it('does not work when de-registered', async function() {
        // Transfer tokens as accounts[2] from accounts[1] to accounts[3]
        // value is 1 wei per token
        const amount = granularity.mul(5);
        const value = web3.toWei(amount.toString(), 'wei');
        await truffleAssert.reverts(
                operator.sell(erc777Instance.address, accounts[1], {
                    from: accounts[2],
                    value: value
                }), 'not allowed to send');
    });
});
