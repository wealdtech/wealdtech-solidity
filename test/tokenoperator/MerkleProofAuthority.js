'use strict';

const asserts = require('../helpers/asserts.js');
const truffleAssert = require('truffle-assertions');
const MerkleTree = require('merkletreejs');

const ERC777Token = artifacts.require('ERC777Token');
const MerkleProofAuthority = artifacts.require('MerkleProofAuthority');

// Helpers
function leftPad(num, padlen) {
    var pad = new Array(1 + padlen).join('0');
    return (pad + num).slice(-pad.length);
}
function bufToStr(buf, len) {
    return '0x' + leftPad(buf.toString('hex').replace(/^0x/, ''), len);
}
function strToBuf(str) {
    return Buffer.from(str.replace(/^0x/, ''), 'hex');
}
function sha256(data) {
    return strToBuf(web3.utils.sha3(bufToStr(data, 128), { encoding: 'hex' }));
}
function constructProof(tree, leaf) {
    const treeProof = tree.getProof(leaf);
    var proof = [];
    var path = 0;
    for (var i = 0; i < treeProof.length; i++) {
        if (treeProof[i].position === 'right') {
            path |= (1 << i);
        }
        proof.push(bufToStr(treeProof[i].data, 64));
    }
    return {path, proof};
}

contract('MerkleProofAuthority', accounts => {
    var erc777Instance;
    var operator;
    var tree;
    var leaves;

    const granularity = web3.utils.toBN('10000000000000000');
    const initialSupply = granularity.mul(web3.utils.toBN('10000000'));

    let tokenBalances = {};
    tokenBalances[accounts[0]] = web3.utils.toBN(0);
    tokenBalances[accounts[1]] = web3.utils.toBN(0);
    tokenBalances[accounts[2]] = web3.utils.toBN(0);

    it('sets up', async function() {
        operator = await MerkleProofAuthority.new({
            from: accounts[0]
        });

        erc777Instance = await ERC777Token.new(1, 'Test token', 'TST', granularity, initialSupply, [operator.address], '0x0000000000000000000000000000000000000000', {
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

    it('creates the merkle tree', async function() {
        // Create the leaves, which are the hashes of the send parameters
        leaves = [];
        // Transfer of 5 from accounts1 to accounts2
        leaves.push(strToBuf(await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), [], 1)));
        // Another transfer of 5 from accounts1 to accounts2 (different nonce)
        leaves.push(strToBuf(await operator.hashForSend(erc777Instance.address, accounts[1], accounts[2], granularity.mul(web3.utils.toBN('5')), [], 2)));
        // Transfer of 1 from accounts2 to accounts3
        leaves.push(strToBuf(await operator.hashForSend(erc777Instance.address, accounts[2], accounts[1], granularity, [], 1)));
        // Transfer of 1 from accounts1 to accounts3
        leaves.push(strToBuf(await operator.hashForSend(erc777Instance.address, accounts[1], accounts[3], granularity, [], 1)));

        tree = new MerkleTree(leaves, sha256);

        await operator.setRoot(erc777Instance.address, bufToStr(tree.getRoot(), 64), {
            from: accounts[1]
        });
        assert.equal(await operator.getRoot(erc777Instance.address, accounts[1]), bufToStr(tree.getRoot(), 64));
    });

    it('transfers with a valid proof', async function() {
        const {proof, path} = constructProof(tree, leaves[0]);

        const amount = granularity.mul(web3.utils.toBN('5'));
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 1, path, proof, {
            from: accounts[9]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not allow the same transfer twice', async function() {
        const {proof, path} = constructProof(tree, leaves[0]);

        const amount = granularity.mul(web3.utils.toBN('5'));
        // Attempt to transfer tokens again - should fail as the parameters are the same as a previous transaction
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 1, path, proof, {
                    from: accounts[9]
                }), 'tokens already sent');
    });

    it('transfers with a different nonce', async function() {
        const {proof, path} = constructProof(tree, leaves[1]);

        tree.verify(tree.getProof(leaves[1]), leaves[1], tree.getRoot());
        const amount = granularity.mul(web3.utils.toBN('5'));
        await operator.send(erc777Instance.address, accounts[1], accounts[2], amount, [], 2, path, proof, {
            from: accounts[9]
        });
        tokenBalances[accounts[1]] = tokenBalances[accounts[1]].sub(amount);
        tokenBalances[accounts[2]] = tokenBalances[accounts[2]].add(amount);
        await asserts.assertTokenBalances(erc777Instance, tokenBalances);
    });

    it('does not allow transfers from another account', async function() {
        const {proof, path} = constructProof(tree, leaves[2]);

        const amount = granularity;
        // Attempt to transfer tokens again - should fail as the holder is not the designated account
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[2], accounts[1], amount, [], 1, path, proof, {
                    from: accounts[9]
                }), 'merkle proof invalid');
    });

    it('does not work when revoked', async function() {
        await erc777Instance.revokeOperator(operator.address, {
            from: accounts[1]
        });
        assert.equal(await erc777Instance.isOperatorFor(operator.address, accounts[1]), false);

        const {proof, path} = constructProof(tree, leaves[2]);

        const amount = granularity;
        await truffleAssert.reverts(
                operator.send(erc777Instance.address, accounts[1], accounts[3], amount, [], 1, path, proof, {
                    from: accounts[9]
                }), 'merkle proof invalid');
    });
});
