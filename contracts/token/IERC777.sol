pragma solidity ^0.5.0;


/**
 * @title IERC777
 *        IERC777 is the interface for ERC777-compliant tokens.
 *        ERC777 is defined at https://github.com/ethereum/EIPs/issues/777
 *
 * @author Jim McDonald
 */
contract IERC777 {
    function name() public view returns (string memory);
    function symbol() public view returns (string memory);
    function totalSupply() public view returns (uint256);
    function balanceOf(address owner) public view returns (uint256);
    function granularity() public view returns (uint256);

    function authorizeOperator(address operator) public;
    function revokeOperator(address operator) public;
    function isOperatorFor(address operator, address tokenHolder) public view returns (bool);

    function send(address to, uint256 amount, bytes memory data) public;
    function operatorSend(address from, address to, uint256 amount, bytes memory data, bytes memory operatorData) public;

    function burn(uint256 amount, bytes memory data) public;
    function operatorBurn(address from, uint256 amount, bytes memory data, bytes memory operatorData) public;

    event Sent(address indexed operator, address indexed from, address indexed to, uint256 amount, bytes data, bytes operatorData);
    event Minted(address indexed operator, address indexed to, uint256 amount, bytes data);
    event Burned(address indexed operator, address indexed from, uint256 amount, bytes data, bytes operatorData);
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
}
