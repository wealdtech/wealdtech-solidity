pragma solidity ^0.4.11;

import './Routable.sol';


contract F1 is Routable {
    uint256 intVal;

    function addRoutes(address _this) {
        routes[bytes4(sha3("getUInt256()"))] = Route({target: _this, returnSize: 32});
        routes[bytes4(sha3("setUInt256(uint256)"))] = Route({target: _this, returnSize: 0});
    }

    function getUInt256() returns (uint256) {
        return intVal;
    }

    function setUInt256(uint256 _intVal) {
        intVal = _intVal;
    }
}
