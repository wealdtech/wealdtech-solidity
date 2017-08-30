pragma solidity ^0.4.11;


// Copyright © 2017 Jim McDonald
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


/**
 * @title Permissioned
 * Permission structure and modifiers.  Permissions are described by the
 * tuple (address, permission id).  The permission ID of 0xffffffff is
 * reserved for altering permissions within this contract.
 * Note that any address allowed to modify permissions is implicitly
 * granted all permissions.
 */
contract Permissioned {
    mapping(address=>mapping(uint32=>bool)) permissions;

    // The constant for the permission to modify permissions
    uint32 constant PERM_MODIFY_PERMS = 0xffffffff;

    /**
     * @dev The Permissioned constructor gives the initial contract owner the
     * ability to set permissions.
     */
    function Permissioned() {
        permissions[msg.sender][PERM_MODIFY_PERMS] = true;
    }

    /**
     * @dev A modifier that requires the message sender to be the current
     * contract owner.
     */
    modifier ifPermitted(address addr, uint32 permission) {
        require(permissions[addr][permission] || permissions[addr][PERM_MODIFY_PERMS]);
        _;
    }
    
    /**
     * @dev Set or reset a permission.
     */
    function setPermission(address addr, uint32 permission, bool allowed) ifPermitted(msg.sender, PERM_MODIFY_PERMS) {
        permissions[addr][permission] = allowed;
    }
}
