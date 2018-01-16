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
    // Complete zones
    mapping(bytes32=>bytes) public zones;

    // SOA records
    // node => data
    uint16 constant SOA_RR = 6;
    mapping(bytes32=>bytes) public soaRecords;
    uint16 constant RRSIG_RR = 46;
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

    // DnsResolver requires the ENS registry to confirm ownership of nodes
    function DnsResolver(AbstractENS _registry) public PublicResolver(_registry) {
        registry = _registry;
    }

    // 0xa8fa5682 == bytes4(keccak256("dnsRecord(bytes32,bytes32,uint16)"))
    // 0x233a359c == bytes4(keccak256("setDnsZone(bytes32,bytes)"))
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == 0xa8fa5682 || interfaceId == 0x233a359c || super.supportsInterface(interfaceId);
    }
    
    /**
     * Set the values for a DNS record.
     * @param node the namehash of the node for which to store the record
     * @param name the name of the label for which to store the record
     * @param resource the ID of the resource as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
     * @param data the DNS record in wire format
     * @param soaData the DNS SOA record in wire format (can be empty if not updating the SOA, must be empty if resource ID is SOA)
     */
    function setDnsRecord(bytes32 node, bytes32 name, uint16 resource, bytes data, bytes soaData) public onlyNodeOwner(node) {
        // Cannot set RRSIGs directly
        require(resource != RRSIG_RR);

        if (records[node][name][resource].length == 0) {
            nameEntriesCount[node][name] += 1;
        }
        if (resource == SOA_RR) {
            require(soaData.length == 0);
            soaRecords[node] = data;
        } else {
            records[node][name][resource] = data;
            if (soaData.length > 0) {
                soaRecords[node] = soaData;
            }
        }
    }

    /**
     * Obtain a DNS record.
     * @param node the namehash of the node for which to fetch the record
     * @param name the name of the label for which to fetch the record
     * @param resource the ID of the resource as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
     * @return the DNS record in wire format if present, otherwise empty
     */
    function dnsRecord(bytes32 node, bytes32 name, uint16 resource) public view returns (bytes data) {
        if (resource == SOA_RR) {
            return soaRecords[node];
        }
        return records[node][name][resource];
    }

    /**
     * Clear a DNS record.
     * @param node the namehash of the node for which to clear the record
     * @param name the name of the label for which to clear the record
     * @param resource the ID of the resource as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
     * @param soaData the DNS SOA record in wire format (can be empty if not updating the SOA)
     */
    function clearDnsRecord(bytes32 node, bytes32 name, uint16 resource, bytes soaData) public onlyNodeOwner(node) {
        if (records[node][name][resource].length != 0) {
            nameEntriesCount[node][name] -= 1;
        }
        if (resource == SOA_RR) {
            delete(soaRecords[node]);
        } else {
            delete(records[node][name][resource]);
            if (soaData.length > 0) {
                soaRecords[node] = soaData;
            }
        }
    }

    /**
     * Set the values for a DNS zone.
     * @param node the namehash of the node for which to store the zone
     * @param data the DNS zone in wire format
     */
    function setDnsZone(bytes32 node, bytes data) public onlyNodeOwner(node) {
        zones[node] = data;
    }

    /**
     * Obtain a DNS zone.
     * @param node the namehash of the node for which to fetch the zone
     * @return the DNS zone in wire format if present, otherwise empty
     */
    function dnsZone(bytes32 node) public view returns (bytes data) {
        return zones[node];
    }

    /**
     * Clear the values for a DNS zone.
     * @param node the namehash of the node for which to clear the zone
     */
    function clearDnsZone(bytes32 node) public onlyNodeOwner(node) {
        delete(zones[node]);
    }

    //
    // Helper functions
    //

    /**
     * Check if we are authoritative for a zone through presence of an SOA
     * record.
     * @param node the namehash of the node for which to check for the zone
     * @return true if we have an SOA record for this zone, otherwise false
     */
    function hasDnsZone(bytes32 node) public view returns (bool hasRecords) {
        return soaRecords[node].length != 0;
    }

    /**
     * Check for existence of DNS records for a name on a node.
     * @param node the namehash of the node for which to check for the records
     * @param name the name of the label for which to check for the records
     * @return true if we have any records for this node/name combination, otherwise false
     */ 
    function hasDnsRecords(bytes32 node, bytes32 name) public view returns (bool hasRecords) {
        return nameEntriesCount[node][name] != 0;
    }
}
