pragma solidity ^0.5.0;

// Copyright © 2017-2019 Weald Technology Trading Limited
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

import '@ensdomains/resolver/contracts/PublicResolver.sol';
import '@ensdomains/ens/contracts/ENS.sol';
import './RRUtils.sol';


/**
 * @title DNSResolver
 *        A DNS resolver that handles all common types of DNS resource record,
 *        plus the ability to expand to new types arbitrarily.
 *
 *        Definitions used within this contract are as follows:
 *          - node is the namehash of the ENS domain e.g. namehash('myzone.eth')
 *          - name is the keccak-256 hash of the DNS wire-format fully-qualified name of the node, for example if the
 *            fully-qualified name is 'www.myzone.eth' then the DNS wire format is '\03www\06myzone\03eth\00' and name is
 *            keccak256('\03www\06myzone\03eth\00')
 *          - resource is the numeric ID of the record from https://en.wikipedia.org/wiki/List_of_DNS_record_types
 *          - data is DNS wire format data for the record
 *
 *        State of this contract: under development; ABI not finalised and subject
 *        to change.  Do not use.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating to
 *         wsl.wealdtech.eth to support continued development of these and
 *         future contracts
 */
contract DNSResolver is PublicResolver {
    using RRUtils for *;
    using BytesUtils for bytes;

    // Version the mapping for each zone.  This allows users who have lost track of their entries to effectively delete an entire
    // zone by bumping the version number.
    // node => version
    mapping(bytes32=>uint16) public versions;

    // The records themselves.  Stored as RRSETs
    // node => name => version => resource => data
    mapping(bytes32=>mapping(uint16=>mapping(bytes32=>mapping(uint16=>bytes)))) public records;

    // Count of number of entries for a given name.  Required for DNS resolvers when resolving wildcards.
    // node => name => version => number of records
    mapping(bytes32=>mapping(uint16=>mapping(bytes32=>uint16))) public nameEntriesCount;

    // The ENS registry.
    ENS registry;

    // Restrict operations to the owner of the relevant ENS node.
    modifier onlyNodeOwner(bytes32 node) {
        require(msg.sender == registry.owner(node));
        _;
    }

    // DNSResolver requires the ENS registry to confirm ownership of nodes.
    constructor(ENS _registry) public PublicResolver(_registry) {
        require(address(_registry) != address(0));
        registry = _registry;
    }

    // 0xa8fa5682 == bytes4(keccak256("dnsRecord(bytes32,bytes32,uint16)"))
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == 0xa8fa5682 || super.supportsInterface(interfaceId);
    }
    
    // Updated is emitted whenever a given node/name/resource's RRSET is updated.
    event Updated(bytes32 node, bytes name, uint16 resource);
    // Deleted is emitted whenever a given node/name/resource's RRSET is deleted.
    event Deleted(bytes32 node, bytes name, uint16 resource);
    // Cleared is emitted whenever a given node's zone information is cleared.
    event Cleared(bytes32 node);

    /**
     * Set one or more DNS records.  Records are supplied in wire-format.  Records with the same node/name/resource must be
     * supplied one after the other to ensure the data is updated correctly. For example, if the data was supplied:
     *     a.example.com IN A 1.2.3.4
     *     a.example.com IN A 5.6.7.8
     *     www.example.com IN CNAME a.example.com.
     * then this would store the two A records for a.example.com correctly as a single RRSET, however if the data was supplied:
     *     a.example.com IN A 1.2.3.4
     *     www.example.com IN CNAME a.example.com.
     *     a.example.com IN A 5.6.7.8
     * then this would store the first A record, the CNAME, then the second A record which would overwrite the first.
     *
     * @param _node the namehash of the node for which to set the records
     * @param _data the DNS wire format records to set
     */
    function setDNSRecords(bytes32 _node, bytes memory _data) public onlyNodeOwner(_node) {
        uint16 resource = 0;
        uint256 offset = 0;
        bytes memory name;
        bytes memory value;
        bytes32 nameHash;
        uint16 version = versions[_node];
        // Iterate over the data to add the resource records
        for(RRUtils.RRIterator memory iter = _data.iterateRRs(0); !iter.done(); iter.next()) {
            if (resource == 0) {
                resource = iter.dnstype;
                name = bytes(iter.name());
                nameHash = keccak256(name);
                value = bytes(iter.rdata());
            } else {
                bytes memory newName = bytes(iter.name());
                if (resource != iter.dnstype || !name.equals(newName)) {
                    bytes memory rrData = _data.substring(offset, iter.offset - offset);
                    if (value.length == 0) {
                        if (records[_node][version][nameHash][resource].length != 0) {
                            nameEntriesCount[_node][version][nameHash]--;
                        }
                        delete(records[_node][version][nameHash][resource]);
                        emit Deleted(_node, name, resource);
                    } else {
                        if (records[_node][version][nameHash][resource].length == 0) {
                            nameEntriesCount[_node][version][nameHash]++;
                        }
                        records[_node][version][nameHash][resource] = rrData;
                        emit Updated(_node, name, resource);
                    }
                    resource = iter.dnstype;
                    offset = iter.offset;
                    name = newName;
                    nameHash = keccak256(name);
                    value = bytes(iter.rdata());
                }
            }
        }
        bytes memory rrData = _data.substring(offset, _data.length - offset);
        if (value.length == 0) {
            if (records[_node][version][nameHash][resource].length != 0) {
                nameEntriesCount[_node][version][nameHash]--;
            }
            delete(records[_node][version][nameHash][resource]);
            emit Deleted(_node, name, resource);
        } else {
            if (records[_node][version][nameHash][resource].length == 0) {
                nameEntriesCount[_node][version][nameHash]++;
            }
            records[_node][version][nameHash][resource] = rrData;
            emit Updated(_node, name, resource);
        }
    }

    /**
     * Obtain a DNS record.
     * @param _node the namehash of the node for which to fetch the record
     * @param _name the keccak-256 hash of the fully-qualified name for which to fetch the record
     * @param _resource the ID of the resource as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
     * @return the DNS record in wire format if present, otherwise empty
     */
    function dnsRecord(bytes32 _node, bytes32 _name, uint16 _resource) public view returns (bytes memory) {
        return records[_node][versions[_node]][_name][_resource];
    }

    /**
     * Check if a given node has records.
     * @param _node the namehash of the node for which to check the records
     * @param _name the namehash of the node for which to check the records
     */
    function hasDNSRecords(bytes32 _node, bytes32 _name) public view returns (bool) {
        return (nameEntriesCount[_node][versions[_node]][_name] != 0);
    }

    /**
     * Clear all information for a DNS zone.
     * @param _node the namehash of the node for which to clear the zone
     */
    function clearDNSZone(bytes32 _node) public onlyNodeOwner(_node) {
        versions[_node]++;
        emit Cleared(_node);
    }
}
