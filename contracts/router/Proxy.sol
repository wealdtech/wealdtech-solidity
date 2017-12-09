pragma solidity ^0.4.18;


contract Proxy {
    address public target;

    function () public payable {
        address _target = target;
        assembly {
          let _calldata := mload(0x40)
          mstore(0x40, add(_calldata, calldatasize))
          calldatacopy(_calldata, 0x0, calldatasize)
          switch delegatecall(gas, _target, _calldata, calldatasize, 0, 0)
              case 0 {
                  revert(0, 0)
              }
              default {
                  returndatacopy(0, 0, returndatasize)
                  return(0, returndatasize)
              }
        }
    }
}
