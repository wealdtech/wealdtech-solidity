pragma solidity ^0.4.11;


/**
 * @title TokenAgent
 * An agent that handles sales of tokens
 */
contract TokenAgent {
    // The address of the token being sold
    address token;

    /**
     * @dev active states if the agent is currently active.
     */ 
    function active() public constant returns (bool);

    /**
     * @dev provide the number of tokens available.
     */
    function tokensAvailable() public constant returns (uint256);

    /**
     * @dev attempt to obtain tokens depending on the amount of funds
     * supplied.
     */
    function obtain() public payable returns (uint256);
}
