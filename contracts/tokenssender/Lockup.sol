pragma solidity ^0.4.24;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title Lockup
 *
 *        An ERC777 tokens sender contract that locks up tokens for a given time
 *        period.
 *        
 *        To use this contract a token holder should first call setExpiry() to
 *        set the timestamp of the lockup expiry, then call setAllowance() for
 *        each recipient.
 *
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Lockup is ERC777TokensSender, ERC820Implementer {
    using SafeMath for uint256;

    // Mapping is token=>holder=>recipient=>allowance
    mapping(address=>mapping(address=>mapping(address=>uint256))) private allowance;

    // Mapping is token=>holder=>expiry of lockup
    mapping(address=>mapping(address=>uint256)) private expiries;

    event Allowance(address token, address holder, address recipient, uint256 amount);
    event LockupExpires(address token, address holder, uint256 expiry);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
      * Set the allowance for a given recipient
      * @param _token the address of the token contract
      * @param _recipient the address of the recipient
      * @param _amount the amount of tokens to allow
      */
    function setAllowance(address _token, address _recipient, uint256 _amount) public {
        allowance[_token][msg.sender][_recipient] = _amount;
        emit Allowance(_token, msg.sender, _recipient, _amount);
    }

    /*
     * Get the allowance for a given recipient
     * @param _token the address of the token contract
     * @param _holder the address of the holder
     * @param _recipient the address of the recipient
     * @return the allowance
     */
    function getAllowance(address _token, address _holder, address _recipient) public view returns (uint256) {
        return allowance[_token][_holder][_recipient];
    }

    /*
     * Set the expiry for a token
     * @param _token the address of the token contract
     * @param _expiry the unix timestamp at which the lockup expires
     */
    function setExpiry(address _token, uint256 _expiry) public {
        expiries[_token][msg.sender] = _expiry;
        emit LockupExpires(_token, msg.sender, _expiry);
    }

    /*
     * Get the expiry for a token
     * @param _token the address of the token contract
     * @param _holder the address of the holder
     * @return the unix timestamp at which the lockup expires
     */
    function getExpiry(address _token, address _holder) public view returns (uint256) {
        return expiries[_token][_holder];
    }

    event Foo(uint256 dt1, uint256 dt2);
    /**
     * This ensures that the lockup for the token has expired and that the
     * amount transferred does not exceed the allowance
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public payable {
        (operator, data, operatorData);

        require(msg.value == 0, "ether not accepted");
        require(expiries[msg.sender][holder] != 0, "lockup expiry is not set");
        require(now >= expiries[msg.sender][holder], "lockup has not expired");
        require(allowance[msg.sender][holder][recipient] <= amount, "amount exceeds allowance");
        emit Foo(now, expiries[msg.sender][holder]);
        allowance[msg.sender][holder][recipient] = allowance[msg.sender][holder][recipient].sub(amount);
    }
}
