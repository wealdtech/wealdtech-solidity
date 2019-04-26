pragma solidity ^0.5.0;


// Simple hello world contract
contract HelloWorld {
    uint256 HELLO_WORLD = 0x4e110;
    function hello() public view returns (uint256) {
        return HELLO_WORLD;
    }
}
