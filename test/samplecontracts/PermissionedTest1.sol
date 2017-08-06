pragma solidity ^0.4.11;

import '../../contracts/auth/Permissioned.sol';


// Test Permissioned contract
contract PermissionedTest1 is Permissioned {
  uint32 constant public PERMS_SET_INT = 2;
  uint32 constant public PERMS_SET_BOOL = 3;

  uint256 public intValue = 0;
  bool public boolValue = false;

  function PermissionedTest1() {
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
