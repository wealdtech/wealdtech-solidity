pragma solidity ^0.4.24;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title Authorised
 *
 *        An ERC777 tokens sender contract that requires the holder,
 *        operator, amount and value to match values in the supplied
 *        signature to allow a transfer to proceed.
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
contract Authorised is ERC777TokensSender, ERC820Implementer {
    using SafeMath for uint256;

    // Mapping is hash=>used, to stop replays
    mapping(bytes32=>bool) private usedHashes;

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
     * This expects operatorData to contain the signature (65 bytes)
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public payable {
        (recipient);

        // Ensure that operatorData contains the correct number of bytes
        require(operatorData.length == 65, "length of operator data incorrect");

        bytes32 hash = hashForSend(operator, amount, msg.value, data);
        require(!usedHashes[hash], "tokens already sent");

        address signatory = signer(hash, operatorData);
        require(signatory != 0, "signatory is invalid");
        require(signatory == holder, "signatory is not the holder");
        usedHashes[hash] = true;
        holder.transfer(msg.value);
    }

    /**
     * This generates the hash for the signature
     */
    function hashForSend(address operator, uint256 amount, uint256 value, bytes data) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), operator, amount, value, data));
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
