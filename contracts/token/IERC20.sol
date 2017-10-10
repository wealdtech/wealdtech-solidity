pragma solidity ^0.4.11;


/**
 * @title IERC20
 *        IERC20 is the interface for ERC20-compliant tokens.
 *        ERC20 is defined at https://github.com/ethereum/EIPs/issues/20
 */
contract IERC20 {
    function name() public constant returns (string name);
    function symbol() public constant returns (string symbol);
    function decimals() public constant returns (uint8 decimals);

    function totalSupply() public constant returns (uint256 totalSupply);
    function balanceOf(address _owner) public constant returns (uint256 balance);
    function transfer(address _owner, uint256 _value) public returns (bool success);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function allowance(address _owner, address _spender) public constant returns (uint256 remaining);
    function transferFrom(address _owner, address _to, uint256 _value) public returns (bool success);
    function approve(address _spender, uint256 _value) public returns (bool success);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
