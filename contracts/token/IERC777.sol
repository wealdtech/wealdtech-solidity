pragma solidity ^0.4.18;


/**
 * @title IERC777
 *        IERC777 is the interface for ERC777-compliant tokens.
 *        IERC777 is defined at https://github.com/ethereum/EIPs/issues/777
 */
contract IERC777 {
    function name() public constant returns (string);
    function symbol() public constant returns (string);
    function granularity() public constant returns (uint256);
    function totalSupply() public constant returns (uint256);
    function balanceOf(address owner) public constant returns (uint256);

    function send(address to, uint256 amount, bytes userData) public;
    function burn(uint256 amount, bytes userData) public;

    function authorizeOperator(address operator) public;
    function revokeOperator(address operator) public;
    function isOperatorFor(address operator, address tokenHolder) public constant returns (bool);
    function operatorSend(address from, address to, uint256 amount, bytes userData, bytes operatorData) public;
    function operatorBurn(address from, uint256 amount, bytes userData, bytes operatorData) public;

    event Sent(address indexed operator, address indexed from, address indexed to, uint256 amount, bytes userData, bytes operatorData);
    event Minted(address indexed operator, address indexed to, uint256 amount, bytes userData);
    event Burned(address indexed operator, address indexed from, uint256 amount, bytes userData, bytes operatorData);
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
}
