pragma solidity ^0.4.11;


/**
 * @title IERC20
 *        IERC20 is the interface for ERC20-compliant tokens.
 *        ERC20 is defined at https://github.com/ethereum/EIPs/issues/20
 */
contract IERC20 {
    function name() public constant returns (string _name);
    function symbol() public constant returns (string _symbol);
    function decimals() public constant returns (uint8 _decimals);

    function totalSupply() public constant returns (uint256 _totalSupply);
    function balanceOf(address _owner) public constant returns (uint256 _balance);
    function transfer(address _owner, uint256 _value) public returns (bool _success);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function allowance(address _owner, address _spender) public constant returns (uint256 _remaining);
    function transferFrom(address _owner, address _to, uint256 _value) public returns (bool _success);
    function approve(address _spender, uint256 _value) public returns (bool _success);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
