const ENS = artifacts.require("./ENS.sol");
const MockEnsRegistrar = artifacts.require("./contracts/MockEnsRegistrar.sol");
const DnsResolver = artifacts.require("./contracts/ens/DnsResolver.sol");

const sha3 = require('solidity-sha3').default;
const assertJump = require('../helpers/assertJump');

const increaseTime = addSeconds => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [addSeconds], id: 0 })
const mine = () => web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 })

const ethLabelHash = sha3('eth');
const ethNameHash = sha3('0x0000000000000000000000000000000000000000000000000000000000000000', ethLabelHash);

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

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x012345', '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 2, '0x012345', '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 2);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 2);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 2, '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 1, '', { from: testDomainOwner });
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

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x012345', '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x543210', '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 1);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 1);

        await resolver.clearDnsRecord(testDomainNameHash, testNameHash, 1, '', { from: testDomainOwner });
        assert.equal(await resolver.nodeEntries(testDomainNameHash), 0);
        assert.equal(await resolver.nameEntries(testDomainNameHash, testNameHash), 0);
    });

    it('should update SOA correctly', async() => {
        const testDomain = 'test3';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);
        const testName = 'test3.eth.';
        const testNameHash = sha3(testName);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x111111', '0xffffff', { from: testDomainOwner });
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 1), '0x111111');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 6), '0xffffff');

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x222222', '', { from: testDomainOwner });
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 1), '0x222222');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 6), '0xffffff');

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 1, '0x222222', '0xeeeeee', { from: testDomainOwner });
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 1), '0x222222');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 6), '0xeeeeee');

        await resolver.setDnsRecord(testDomainNameHash, testNameHash, 6, '0xdddddd', '0xcccccc', { from: testDomainOwner });
        assert.equal(await resolver.dnsRecord(testDomainNameHash, testNameHash, 6), '0xdddddd');

    });

});
