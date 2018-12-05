pragma solidity ^0.5.0;

import '../../contracts/token/ERC20Token.sol';


// Test token for ERC20-compatible functions
contract TestERC20Token is ERC20Token {
    constructor() ERC20Token(1, "TestToken", "TST", 2, 10000, address(0)) public { }
}
