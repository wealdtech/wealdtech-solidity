pragma solidity ^0.4.18;

import './PublicResolver.sol';


// Copyright © 2017 Weald Technology Trading Limited
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

contract EnsRegistry {
    function owner(bytes32 node) public constant returns(address);
}


/**
 * @title DnsResolver
 *        A DNS resolver that handles all common types of DNS resource record,
 *        plus the ability to expand to new types arbitrarily.
 *
 *        Definitions used within this contract are as follows:
 *          - node is the namehash of the ENS domain e.g. namehash('myzone.eth')
 *          - name is the sha3 of the fully-qualifid name of the node e.g. keccak256('www.myzone.eth.') (note the trailing period)
 *          - resource is the numeric ID of the record from https://en.wikipedia.org/wiki/List_of_DNS_record_types
 *          - data is DNS wire format data for the record
 *
 *        State of this contract: under development; ABI not finalised and subject
 *        to change.  Do not use.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract DnsResolver is PublicResolver {

    // SOA records
    // node => data
    uint16 constant SOA_RR = 6;
    mapping(bytes32=>bytes) public soaRecords;
    // RRSIG records
    // node => name => RRSIG resource => data
    uint16 constant RRSIG_RR = 46;
    mapping(bytes32=>mapping(bytes32=>mapping(uint16=>bytes))) public rrsigRecords;
    // All other records
    // node => name => resource => data
    mapping(bytes32=>mapping(bytes32=>mapping(uint16=>bytes))) public records;

    // Count of number of entries for a given name
    mapping(bytes32=>mapping(bytes32=>uint16)) public nameEntriesCount;

    // The ENS registry
    AbstractENS registry;

    // Restrict operations to the owner of the relevant ENS node
    modifier onlyNodeOwner(bytes32 node) {
        require(msg.sender == registry.owner(node));
        _;
    }

    function DnsResolver(AbstractENS _registry) public PublicResolver(_registry) {
        registry = _registry;
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == 0xd7c2836a || super.supportsInterface(interfaceId);
    }
    
    function hasDnsZone(bytes32 node) public view returns (bool hasRecords) {
        return soaRecords[node].length != 0;
    }

    function dnsRecord(bytes32 node, bytes32 name, uint16 resource) public view returns (bytes data, bytes sigData) {
        if (resource == SOA_RR) {
            return (soaRecords[node], rrsigRecords[node][name][resource]);
        }
        return (records[node][name][resource], rrsigRecords[node][name][resource]);
    }

    function hasDnsRecords(bytes32 node, bytes32 name) public view returns (bool hasRecords) {
        return nameEntriesCount[node][name] != 0;
    }

    /**
     * setDnsRecord sets the values for a DNS record
     * @param node the namehash of the node for which to store the record
     * @param name the name of the label for which to store the record
     * @param resource the ID of the resource as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
     * @param data the DNS record in wire format
     * @param sigData the signature of the DNS record (can be empty for unsigned records)
     * @param soaData the DNS SOA record in wire format (can be empty if not updating the SOA)
     * @param sigData the signature of the SOA DNS record (can be empty for unsigned records)
     */
    function setDnsRecord(bytes32 node, bytes32 name, uint16 resource, bytes data, bytes sigData, bytes soaData, bytes soaSigData) public onlyNodeOwner(node) {
        // Cannot set RRSIGs directly
        require(resource != RRSIG_RR);

        if (records[node][name][resource].length == 0) {
            nameEntriesCount[node][name] += 1;
        }
        if (resource == SOA_RR) {
            soaRecords[node] = data;
            rrsigRecords[node][name][SOA_RR] = sigData;
        } else {
            records[node][name][resource] = data;
            rrsigRecords[node][name][resource] = sigData;
            if (soaData.length > 0) {
                soaRecords[node] = soaData;
                rrsigRecords[node][name][SOA_RR] = soaSigData;
            }
        }
    }

    function clearDnsRecord(bytes32 node, bytes32 name, uint16 resource, bytes soaData) public onlyNodeOwner(node) {
        if (records[node][name][resource].length != 0) {
            nameEntriesCount[node][name] -= 1;
        }
        if (resource == SOA_RR) {
            delete(soaRecords[node]);
        } else {
            delete(records[node][name][resource]);
            delete(rrsigRecords[node][name][resource]);
            if (soaData.length > 0) {
                soaRecords[node] = soaData;
            }
        }
    }
}
