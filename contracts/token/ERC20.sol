pragma solidity ^0.4.11;


/**
 * @title ERC20
 *        Definition of the ERC20 interface.  Details about this interface
 *        are avaialable at https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 {
    function balanceOf(address who) constant returns (uint256);
    function transfer(address to, uint256 value) returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function allowance(address owner, address spender) constant returns (uint256);
    function transferFrom(address from, address to, uint256 value) returns (bool);
    function approve(address spender, uint256 value) returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
