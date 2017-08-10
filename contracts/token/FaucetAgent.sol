pragma solidity ^0.4.11;

import './TokenAgent.sol';
import '../../node_modules/zeppelin-solidity/contracts/token/ERC20.sol';
import '../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';


/**
 * @title FaucetAgent
 * A simple agent that sells all tokens that it has at a fixed exchange
 * rate
 */
contract FaucetAgent is TokenAgent {
    using SafeMath for uint256;

    // The token that the agent is selling
    ERC20 token;

    // The number of tokens per Wei.
    uint256 tokensPerWei;

    function FaucetAgent(ERC20 _token, uint256 _tokensPerWei) {
        token = _token;
        require(_tokensPerWei > 0);
        tokensPerWei = _tokensPerWei;
    }

    /**
     * @dev active states if the agent is currently active.
     */ 
    function active() public constant returns (bool) {
        return tokensAvailable() > 0;
    }

    /**
     * @dev provide the number of tokens available.
     */
    function tokensAvailable() public constant returns (uint256) {
        return token.balanceOf(this);
    }

    /**
     * @dev attempt to obtain tokens depending on the amount of funds
     * supplied.
     */
    function obtain() public payable returns (uint256) {
        var amount = msg.value.mul(tokensPerWei);
        require(amount > 0);
        token.transfer(msg.sender, amount);
    }
}
