pragma solidity ^0.4.23;

import '../../contracts/auth/Permissioned.sol';


// Permissioned contract for testing
contract PermissionedTest1 is Permissioned {
    bytes32 constant public PERMS_SET_INT = keccak256("permissioned: set int");
    bytes32 constant public PERMS_SET_BOOL = keccak256("permissioned: set bool");

    uint256 public intValue = 0;
    bool public boolValue = false;

    constructor() public {
        intValue = 0;
        boolValue = false;
    }

    function setInt(uint256 _intValue) public ifPermitted(msg.sender, PERMS_SET_INT) {
        intValue = _intValue;
    }

    function setBool(bool _boolValue) public ifPermitted(msg.sender, PERMS_SET_BOOL) {
        boolValue = _boolValue;
    }
}
