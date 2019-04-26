pragma solidity ^0.5.0;


contract Proxy {
    address public target;

    function () external payable {
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
