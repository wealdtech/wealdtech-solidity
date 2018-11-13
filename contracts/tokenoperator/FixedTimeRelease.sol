pragma solidity ^0.4.24;

import '../token/IERC777.sol';


/**
 * @title FixedTimeRelease
 *
 *        An ERC777 token operator contract that releases tokens at a fixed
 *        date/time.
 *        
 *        N.B. this contract will make tokens accessible to anyone after the
 *        release timestamp.  As such it is generally not used by itself but
 *        combined with another token operator contract such as FixedAllowance
 *        or SignatureAuthority to provide the required functionality.
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
contract FixedTimeRelease {
    // Mapping is token=>holder=>release timestamp
    mapping(address=>mapping(address=>uint256)) private releaseTimestamps;

    event ReleaseTimestamp(address token, address holder, uint256 expiry);

    /*
     * Set the release timestamp for a token
     * @param _token the address of the token contract
     * @param _timestamp the unix timestamp at which the tokens are released
     */
    function setReleaseTimestamp(IERC777 _token, uint256 _timestamp) public {
        releaseTimestamps[_token][msg.sender] = _timestamp;
        emit ReleaseTimestamp(_token, msg.sender, _timestamp);
    }

    /*
     * Get the release timestamp for a token
     * @param _token the address of the token contract
     * @param _holder the address of the holder
     * @return the unix timestamp at which the tokens are released
     */
    function getReleaseTimestamp(IERC777 _token, address _holder) public view returns (uint256) {
        return releaseTimestamps[_token][_holder];
    }

    function send(IERC777 _token, address _holder, address _recipient, uint256 _amount) public {
        confirmAllowed(_token, _holder);
        _token.operatorSend(_holder, _recipient, _amount, "", "");
    }

    function confirmAllowed(IERC777 _token, address _holder) internal view {
        require(releaseTimestamps[_token][_holder] != 0, "no release time set");
        require(releaseTimestamps[_token][_holder] <= now, "not yet released");
    }
}
