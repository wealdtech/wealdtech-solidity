pragma solidity ^0.4.11;

import '../../contracts/token/Token.sol';


// Test token for ERC20-compatible functions
contract TestToken is Token {
    function TestToken() Token("TestToken", "TST", 2, 10000, 0) { }
}
