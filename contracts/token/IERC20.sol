pragma solidity ^0.4.11;


/**
 * @title IERC20
 *        IERC20 is the interface for ERC20-compliant tokens.
 *        ERC20 is defined at https://github.com/ethereum/EIPs/issues/20
 */
contract IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    function totalSupply() constant returns (uint256 totalSupply);
    function balanceOf(address _owner) constant returns (uint256 balance);
    function transfer(address _owner, uint256 _value) returns (bool success);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function allowance(address _owner, address _spender) constant returns (uint256 remaining);
    function transferFrom(address _owner, address _to, uint256 _value) returns (bool success);
    function approve(address _spender, uint256 _value) returns (bool success);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
