pragma solidity ^0.4.24;

import '../math/SafeMath.sol';
import '../token/IERC777.sol';


/**
 * @title SignatureAuthority
 *
 *        An ERC777 token operator contract that requires a signature from the
 *        holder to allow the transfer to take place.
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
contract SignatureAuthority {
    using SafeMath for uint256;

    // Mapping is hash=>used, to stop replays
    mapping(bytes32=>bool) private usedHashes;

    /**
     * send tokens from one account to another using the signature as the authority.
     * The signature is created by the authority and signs a hash of the
     * (_token, _holder, _recipient, _amount, _nonce) tuple as created by hashForSend().
     *
     * @param _token the address of the token contract
     * @param _holder the holder of the tokens
     * @param _recipient the recipient of the tokens
     * @param _amount the number of tokens to send
     * @param _data the data field for the operatorSend operation, supplied by the authority
     * @param _nonce a unique field for a given (_token, _holder, _recipient, _amount, _nonce) supplied by the authority
     * @param _signature the signature supplied by the authority
     */
    function send(address _token, address _holder, address _recipient, uint256 _amount, bytes _data, uint256 _nonce, bytes _signature) public {
        // Ensure that signature contains the correct number of bytes
        require(_signature.length == 65, "length of signature incorrect");

        bytes32 hash = hashForSend(_token, _holder, _recipient, _amount, _data, _nonce);
        require(!usedHashes[hash], "tokens already sent");

        address signatory = signer(hash, _signature);
        require(signatory != 0, "signatory is invalid");
        require(signatory == _holder, "signatory is not the holder");
        usedHashes[hash] = true;

        IERC777(_token).operatorSend(_holder, _recipient, _amount, _data, "");
    }

    /**
     * This generates the hash for the signature
     */
    function hashForSend(address token, address holder, address recipient, uint256 amount, bytes data, uint256 nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(token, holder, recipient, amount, data, nonce));
    }

    /**
     * This obtains the signer of a hash given its signature.
     * Note that a returned value of 0 means that the signature is invalid,
     * and should be treated as such.
     */
    function signer(bytes32 _hash, bytes _signature) private pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := and(mload(add(_signature, 65)), 255)
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return 0;
        }

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _hash));
        return ecrecover(prefixedHash, v, r, s);
    }
}
