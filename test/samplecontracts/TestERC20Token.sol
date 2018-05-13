pragma solidity ^0.4.21;

import '../../contracts/token/ERC20Token.sol';


// Test token for ERC20-compatible functions
contract TestERC20Token is ERC20Token {
    constructor() ERC20Token("TestToken", "TST", 2, 10000, 0) public { }
}
