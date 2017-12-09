const ENS = artifacts.require("./ENS.sol");
const MockEnsRegistrar = artifacts.require("./contracts/MockEnsRegistrar.sol");
const DnsResolver = artifacts.require("./contracts/ens/DnsResolver.sol");

const sha3 = require('solidity-sha3').default;
const assertJump = require('../helpers/assertJump');

const increaseTime = addSeconds => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [addSeconds], id: 0 })
const mine = () => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 })

const ethLabelHash = sha3('eth');
const ethNameHash = sha3('0x0000000000000000000000000000000000000000000000000000000000000000', ethLabelHash);
//const testdomain1LabelHash = sha3('testdomain1');
//const testdomain1ethNameHash = sha3(ethNameHash, testdomain1LabelHash);
//const testdomain2LabelHash = sha3('testdomain2');
//const testdomain2ethNameHash = sha3(ethNameHash, testdomain2LabelHash);
//const testdomain3LabelHash = sha3('testdomain3');
//const testdomain3ethNameHash = sha3(ethNameHash, testdomain3LabelHash);
//const testdomain4LabelHash = sha3('testdomain4');
//const testdomain4ethNameHash = sha3(ethNameHash, testdomain4LabelHash);
//const testdomain5LabelHash = sha3('testdomain5');
//const testdomain5ethNameHash = sha3(ethNameHash, testdomain5LabelHash);
//const testdomain6LabelHash = sha3('testdomain6');
//const testdomain6ethNameHash = sha3(ethNameHash, testdomain6LabelHash);
//const testdomain7LabelHash = sha3('testdomain7');
//const testdomain7ethNameHash = sha3(ethNameHash, testdomain7LabelHash);
//const testdomain8LabelHash = sha3('testdomain8');
//const testdomain8ethNameHash = sha3(ethNameHash, testdomain8LabelHash);

contract('DnsResolver', (accounts) => {
    // Accounts
    const registryOwner = accounts[0];
    const registrarOwner = accounts[1];
    const resolverOwner = accounts[2];
    const testDomainOwner = accounts[3];

    // Carry ENS etc. over tests
    var registry;
    var registrar;
    var resolver;

    it('should set up the contracts', async() => {
        registry = await ENS.new({ from: registryOwner });
        registrar = await MockEnsRegistrar.new(registry.address, ethNameHash, { from: registrarOwner, value: web3.toWei(10, 'ether') });
        await registry.setSubnodeOwner("0x0", ethLabelHash, registrar.address);
        resolver = await DnsResolver.new(registry.address, { from: resolverOwner })
//        await registrar.register(testdomain1LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain2LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain3LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain4LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain5LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain6LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain7LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
//        await registrar.register(testdomain8LabelHash, { from: testdomainOwner, value: web3.toWei(0.01, 'ether') });
    });

    it('should track node entries correctly', async() => {
        const testDomain = 'test1';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);
        const testName = 'test1.eth.';
        const testNameHash = sha3(testName);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        assert.equal(await resolver.nodeEntries(testDomainNameHash), 0);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 0);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x012345', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 2, '0x012345', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 2);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 2);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 2, { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 1, { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 0);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 0);
    });

    it('should not double-count node entries', async() => {
        const testDomain = 'test2';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);
        const testName = 'test2.eth.';
        const testNameHash = sha3(testName);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        assert.equal(await resolver.nodeEntries(testDomainNameHash), 0);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 0);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x012345', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x543210', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 1, { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 0);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 0);
    });
});
