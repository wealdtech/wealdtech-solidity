pragma solidity ^0.4.17;


contract Proxy {
    function() public payable {
        assembly {
            switch delegatecall(gas, 0x0000, 0, calldatasize, 0, 0)
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
