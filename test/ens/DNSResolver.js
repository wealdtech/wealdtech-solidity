const ENS = artifacts.require("ENS");
const MockEnsRegistrar = artifacts.require("MockEnsRegistrar");
const DNSResolver = artifacts.require("DNSResolver");

const assertRevert = require('../helpers/assertRevert');
const evm = require('../helpers/evm.js');

const sha3 = require('solidity-sha3').default;

const ethLabelHash = sha3('eth');
const ethNameHash = sha3('0x0000000000000000000000000000000000000000000000000000000000000000', ethLabelHash);

contract('DNSResolver', (accounts) => {
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
        registrar = await MockEnsRegistrar.new(registry.address, ethNameHash, { from: registrarOwner, value: web3.utils.toWei('10', 'ether') });
        await registry.setSubnodeOwner('0x00', ethLabelHash, registrar.address, { from: registryOwner });
        resolver = await DNSResolver.new(registry.address, { from: resolverOwner })
    });

    it('should create new records', async() => {
        const testDomain = 'test1';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        // a.test1.eth. 3600 IN A 1.2.3.4
        const arec = '016105746573743103657468000001000100000e10000401020304';
        // b.test1.eth. 3600 IN A 2.3.4.5
        const b1rec = '016205746573743103657468000001000100000e10000402030405';
        // b.test1.eth. 3600 IN A 3.4.5.6
        const b2rec ='016205746573743103657468000001000100000e10000403040506';
        // test1.eth. 86400 IN SOA ns1.ethdns.xyz. hostmaster.test1.eth. 2018061501 15620 1800 1814400 14400
        const soarec = '05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840';
        const rec = '0x' + arec + b1rec + b2rec + soarec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test1.eth.')), 1), '0x016105746573743103657468000001000100000e10000401020304');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('b.test1.eth.')), 1), '0x016205746573743103657468000001000100000e10000402030405016205746573743103657468000001000100000e10000403040506');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('test1.eth.')), 6), '0x05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840');
    })

    it('should update existing records', async() => {
        const testDomain = 'test1';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        // a.test1.eth. 3600 IN A 4.5.6.7
        const arec = '016105746573743103657468000001000100000e10000404050607';
        // test1.eth. 86400 IN SOA ns1.ethdns.xyz. hostmaster.test1.eth. 2018061502 15620 1800 1814400 14400
        const soarec = '05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840';
        const rec = '0x' + arec + soarec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test1.eth.')), 1), '0x016105746573743103657468000001000100000e10000404050607');
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('test1.eth.')), 6), '0x05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840');
    })

    it('should delete existing records', async() => {
        const testDomain = 'test1';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        // b.test1.eth. 3600 IN A
        const brec = '016205746573743103657468000001000100000e100000';
        // test1.eth. 86400 IN SOA ns1.ethdns.xyz. hostmaster.test1.eth. 2018061503 15620 1800 1814400 14400
        const soarec = '05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbf00003d0400000708001baf8000003840';
        const rec = '0x' + brec + soarec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        assert.isNull(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('b.test1.eth.')), 1));
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('test1.eth.')), 6), '0x05746573743103657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbf00003d0400000708001baf8000003840');
    })

    it('should keep track of entries', async() => {
        const testDomain = 'test1';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        // c.test1.eth. 3600 IN A 1.2.3.4
        const crec = '016305746573743103657468000001000100000e10000401020304';
        const rec = '0x' + crec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        // Initial check
        var hasEntries = await resolver.hasDNSRecords(testDomainNameHash, sha3(dnsName('c.test1.eth.')), { from: testDomainOwner });
        assert.equal(hasEntries, true);
        hasEntries = await resolver.hasDNSRecords(testDomainNameHash, sha3(dnsName('d.test1.eth.')), { from: testDomainOwner });
        assert.equal(hasEntries, false);

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        // Update makes no difference
        hasEntries = await resolver.hasDNSRecords(testDomainNameHash, sha3(dnsName('c.test1.eth.')), { from: testDomainOwner });
        assert.equal(hasEntries, true);

        // c.test1.eth. 3600 IN A
        const crec2 = '016305746573743103657468000001000100000e100000';
        const rec2 = '0x' + crec2;

        await resolver.setDNSRecords(testDomainNameHash, rec2, { from: testDomainOwner });

        // Removal returns to 0
        hasEntries = await resolver.hasDNSRecords(testDomainNameHash, sha3(dnsName('c.test1.eth.')), { from: testDomainOwner });
        assert.equal(hasEntries, false);
    })

    it('can clear a zone', async() => {
        const testDomain = 'test2';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        // a.test2.eth. 3600 IN A 1.2.3.4
        const crec = '016105746573743203657468000001000100000e10000401020304';
        const rec = '0x' + crec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        // Ensure the record is present
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test2.eth.')), 1), '0x016105746573743203657468000001000100000e10000401020304');

        // Clear the zone
        await resolver.clearDNSZone(testDomainNameHash, { from: testDomainOwner });

        // Ensure the record is no longer present
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test2.eth.')), 1), null);

        // Ensure the record can be set again
        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });
        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test2.eth.')), 1), '0x016105746573743203657468000001000100000e10000401020304');
    })

    it('should handle single-record updates', async() => {
        const testDomain = 'test3';
        const testDomainLabelHash = sha3(testDomain);
        const testDomainNameHash = sha3(ethNameHash, testDomainLabelHash);

        await registrar.register(testDomainLabelHash, { from: testDomainOwner });

        // a.test3.eth. 3600 IN A 1.2.3.4
        const arec = '016105746573743303657468000001000100000e10000401020304';
        const rec = '0x' + arec;

        await resolver.setDNSRecords(testDomainNameHash, rec, { from: testDomainOwner });

        assert.equal(await resolver.dnsRecord(testDomainNameHash, sha3(dnsName('a.test3.eth.')), 1), '0x016105746573743303657468000001000100000e10000401020304');
    })
});

function dnsName(name) {
    // strip leading and trailing .
    const n = name.replace(/^\.|\.$/gm, '');

    var bufLen = (n === '') ? 1 : n.length + 2;
    var buf = Buffer.allocUnsafe(bufLen);

    offset = 0;
    if (n.length) {
        const list = n.split('.');
        for (let i = 0; i < list.length; i++) {
            const len = buf.write(list[i], offset + 1)
                buf[offset] = len;
                offset += len + 1;
        }
    }
    buf[offset++] = 0;
    return '0x' + buf.reduce((output, elem) => (output + ('0' + elem.toString(16)).slice(-2)), '');
}
