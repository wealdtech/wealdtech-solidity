'use strict';

const assertRevert = require('../helpers/assertRevert.js');
const sha3 = require('solidity-sha3').default;

const ParticipatoryRandom = artifacts.require('ParticipatoryRandom');

contract('Participatory Random', accounts => {
    var instance;
    it('instantiates the contract', async function() {
        instance = await ParticipatoryRandom.new();
    });
    it('generates source from seed', async function() {
        const instanceId = 1;
        const rounds = 10;
        const seed = '0x0000000000000000000000000000000000000000000000000000000000000002';
        await instance.newInstance(instanceId, rounds);
        const contractSource = await instance.generateSourceFromSeed(instanceId, seed);
        var manualSource = seed ;
        for (let i = 0; i <= rounds; i++) {
            manualSource = sha3(manualSource);
        }
        assert.equal(contractSource, manualSource);
    });

    it('generates values from seed', async function() {
        const instanceId = 2;
        const rounds = 10;
        const seed = '0x0000000000000000000000000000000000000000000000000000000000000001';
        await instance.newInstance(instanceId, rounds);
        await instance.setSource(instanceId, await instance.generateSourceFromSeed(instanceId, seed));
        var manualValue = seed ;
        for (let round = rounds; round > 0; round--) {
            manualValue = sha3(manualValue);
            assert.equal(manualValue, await instance.generateValueFromSeed(instanceId, seed, round));
        }
    });

    it('generates a correct random value', async function() {
        const instanceId = 3;
        const rounds = 10;
        const seed1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const seed2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
        await instance.newInstance(instanceId, rounds);
        await instance.setSource(instanceId, await instance.generateSourceFromSeed(instanceId, seed1));
        await instance.setSource(instanceId, await instance.generateSourceFromSeed(instanceId, seed2, {from: accounts[1]}), {from: accounts[1]});
        const p1r1val = await instance.generateValueFromSeed(instanceId, seed1, 1);
        const p2r1val = await instance.generateValueFromSeed(instanceId, seed2, 1);
        const generatedValue = await instance.generateRandomValue(instanceId, [accounts[0], accounts[1]], 1, [p1r1val, p2r1val]);
        assert.equal(generatedValue, '0xe9437f018e9737338c24adb6a6f2bec0c9da0e09e0b3809a7083af187f581747');
    });

    it('returns the correct max rounds', async function() {
        const instanceId = 4;
        const rounds = 123653;
        await instance.newInstance(instanceId, rounds);
        const cRounds = await instance.getInstanceMaxRounds(instanceId);
        assert.equal(cRounds, rounds);
    });
});
