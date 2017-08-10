pragma solidity ^0.4.11;

import '../../node_modules/zeppelin-solidity/contracts/token/StandardToken.sol';


// Test token for ERC20-compatible functions
contract TestToken is StandardToken {
    string public name = "TestToken";
    string public symbol = "TST";
    uint256 public decimals = 18;
    uint256 public INITIAL_SUPPLY = 10000000000000000000000;
  
    function TestToken() {
        totalSupply = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
}
