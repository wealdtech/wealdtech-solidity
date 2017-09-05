pragma solidity ^0.4.11;

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

import "../auth/Permissioned.sol";


/**
 * @title PermissionedStorage
 *        Permissioned storage is a general-purpose storage contract holding
 *        data that can be set by allowed parties.
 *
 *        Calling set*() requires the caller to have the PERM_WRITE
 *        permission.
 *
 *        Note that permissions are all-or-nothing, so this contract should not
 *        be shared between multiple parties that might have differing
 *        permissions.
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract PermissionedStorage is Permissioned {
    bytes32 constant public PERM_WRITE = keccak256("permissionedstorage: write");

    mapping(bytes32 => uint256) UInt256Storage;

    function getUInt256(bytes32 record) constant public returns (uint256) {
        return UInt256Storage[record];
    }

    function setUInt256(bytes32 record, uint256 value) public ifPermitted(msg.sender, PERM_WRITE) {
        UInt256Storage[record] = value;
    }

    mapping(bytes32 => string) StringStorage;

    function getString(bytes32 record) constant returns (string) {
        return StringStorage[record];
    }

    function setString(bytes32 record, string value) public ifPermitted(msg.sender, PERM_WRITE) {
        StringStorage[record] = value;
    }

    mapping(bytes32 => address) AddressStorage;

    function getAddress(bytes32 record) constant returns (address) {
        return AddressStorage[record];
    }

    function setAddress(bytes32 record, address value) public ifPermitted(msg.sender, PERM_WRITE) {
        AddressStorage[record] = value;
    }

    mapping(bytes32 => bytes) BytesStorage;

    function getBytes(bytes32 record) constant returns (bytes) {
        return BytesStorage[record];
    }

    function setBytes(bytes32 record, bytes value) public ifPermitted(msg.sender, PERM_WRITE) {
        BytesStorage[record] = value;
    }

    mapping(bytes32 => bool) BooleanStorage;

    function getBoolean(bytes32 record) constant returns (bool) {
        return BooleanStorage[record];
    }

    function setBoolean(bytes32 record, bool value) public ifPermitted(msg.sender, PERM_WRITE) {
        BooleanStorage[record] = value;
    }
    
    mapping(bytes32 => int) IntStorage;

    function getInt(bytes32 record) constant returns (int) {
        return IntStorage[record];
    }

    function setInt(bytes32 record, int value) public ifPermitted(msg.sender, PERM_WRITE) {
        IntStorage[record] = value;
    }
}
