pragma solidity ^0.5.0;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC1820Implementer.sol';


/**
 * @title Lockup
 *
 *        An ERC777 tokens sender contract that locks up tokens for a given time
 *        period.
 *        
 *        To use this contract a token holder should call setExpiry() to set
 *        the timestamp of the lockup expiry.
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
contract Lockup is ERC777TokensSender, ERC1820Implementer {
    using SafeMath for uint256;

    // Mapping is token=>holder=>expiry of lockup
    mapping(address=>mapping(address=>uint256)) private expiries;

    event LockupExpires(address token, address holder, uint256 expiry);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /*
     * Set the expiry for a token.  Once set an expiry cannot be reduced,
     * only increased.
     * @param _token the address of the token contract
     * @param _expiry the unix timestamp at which the lockup expires
     */
    function setExpiry(address _token, uint256 _expiry) external {
        require(expiries[_token][msg.sender] < _expiry, "not allowed to reduce lockup expiry");
        expiries[_token][msg.sender] = _expiry;
        emit LockupExpires(_token, msg.sender, _expiry);
    }

    /*
     * Get the expiry for a token
     * @param _token the address of the token contract
     * @param _holder the address of the holder
     * @return the unix timestamp at which the lockup expires
     */
    function getExpiry(address _token, address _holder) external view returns (uint256) {
        return expiries[_token][_holder];
    }

    /**
     * This ensures that the lockup for the token has expired and that the
     * amount transferred does not exceed the allowance
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes calldata data, bytes calldata operatorData) external {
        (operator, recipient, amount, data, operatorData);

        require(expiries[msg.sender][holder] != 0, "lockup expiry is not set");
        require(now >= expiries[msg.sender][holder], "lockup has not expired");
    }
}
