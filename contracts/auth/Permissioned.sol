pragma solidity ^0.4.24;


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

/**
 * @title Permissioned
 *        Permission structure and modifiers.  Permissions are described by the
 *        tuple (address, permission id).  The permission ID is a keccak256()
 *        hash of a developer-selected string.  It is recommended that the
 *        developer use a (short) prefix for their permissions to avoid
 *        clashes, for example a permission might be called
 *        "my contract: upgrade".
 * 
 *        An address must have the superuser permission to alter permissions.
 *        The creator of the contract is made a superuser when the contract is
 *        created.  Be aware that it is possible for the superuser to remove
 *        themselves and leave aspects of a contract unable to be altered; this
 *        is intentional but any such action should be considered carefully.
 *
 *        Note that the prefix of "_" is reserved and should not be used.
 *
 *        Also note that any address with the superuser permission is implicitly
 *        granted all permissions.
 *
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Permissioned {
    mapping(address=>mapping(bytes32=>bool)) internal permissions;

    // The superuser permission
    bytes32 internal constant PERM_SUPERUSER = keccak256("_superuser");

    // Emitted whenever a permission is changed
    event PermissionChanged(address indexed account, bytes32 indexed permission, bool value);

    /**
     * @dev The Permissioned constructor gives the contract creator the
     * superuser permission with the ability to change permissions.
     */
    constructor() public {
        permissions[msg.sender][PERM_SUPERUSER] = true;
        emit PermissionChanged(msg.sender, PERM_SUPERUSER, true);
    }

    /**
     * @dev A modifier that requires the sender to have the presented permission.
     */
    modifier ifPermitted(address addr, bytes32 permission) {
        require(permissions[addr][permission] || permissions[addr][PERM_SUPERUSER]);
        _;
    }
    
    /**
     * @dev query a permission for an address.
     */
    function isPermitted(address addr, bytes32 permission) public constant returns (bool) {
        return(permissions[addr][permission] || permissions[addr][PERM_SUPERUSER]);
    }

    /**
     * @dev Set or reset a permission.
     */
    function setPermission(address addr, bytes32 permission, bool allowed) public ifPermitted(msg.sender, PERM_SUPERUSER) {
        permissions[addr][permission] = allowed;
        emit PermissionChanged(addr, permission, allowed);
    }
}
