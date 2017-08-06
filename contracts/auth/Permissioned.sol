pragma solidity ^0.4.11;


/**
 * @title Permissioned
 * Permission structure and modifiers.  Permissions are described by the
 * tuple (address, permission id).  The permission ID of 1 is reserved for
 * altering permissions within this contract.
 */
contract Permissioned {
    mapping(address=>mapping(uint8=>bool)) permissions;

    // The constant for the permission to modify permissions
    uint8 constant PERM_MODIFY_PERMS = 1;

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
    modifier onlyIfPermitted(address addr, uint8 permission) {
        require(permissions[addr][permission]);
        _;
    }
    
    /**
     * @dev Set or reset a permission.
     */
    function setPermission(address addr, uint8 permission, bool allowed) onlyIfPermitted(msg.sender, PERM_MODIFY_PERMS) {
        permissions[addr][permission] = allowed;
    }
}
