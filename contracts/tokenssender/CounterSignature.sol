pragma solidity ^0.4.18;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title CounterSignature
 *
 *        An ERC777 tokens sender contract that requires a counter-signature
 *        from an approved address to allow a transfer to proceed.
 *
 *        Note that the contract only allows one counter-signatory for each
 *        holder.
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
contract CounterSignature is ERC777TokensSender, ERC820Implementer {
    using SafeMath for uint256;

    // Mapping is holder=>counter signatory
    mapping(address=>address) public counterSignatories;

    // Mapping is hash=>used, to stop replays
    mapping(bytes32=>bool) private usedHashes;

    // An event emitted when a counter-signatory is set
    event CounterSignatorySet(address holder, address signatory);
    // An event emitted when a counter-signatory is cleared
    event CounterSignatoryCleared(address holder);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
     * setCounterSignatory sets a counter-signatory.
     */
    function setCounterSignatory(address _counterSignatory) public {
        counterSignatories[msg.sender] = _counterSignatory;
        emit CounterSignatorySet(msg.sender, _counterSignatory);
    }

    /**
     * clearCounterSignatory clears a counter-signatory.
     */
    function clearCounterSignatory() public {
        counterSignatories[msg.sender] = 0;
        emit CounterSignatoryCleared(msg.sender);
    }

    /**
     * getCounterSignatory gets a counter-signatory.
     */
    function getCounterSignatory(address _holder) public constant returns (address) {
        return counterSignatories[_holder];
    }

    /**
     * This expects operatorData to contain the signature (65 bytes)
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public {

        // Ensure that operatorData contains the correct number of bytes
        require(operatorData.length == 65, "length of operator data incorrect");

        // Token, operator, holder, recipient, amount
        bytes32 hash = hashForCounterSignature(msg.sender, operator, holder, recipient, amount, data);
        require(!usedHashes[hash], "tokens already sent");

        address counterSignatory = signer(hash, operatorData);
        require(counterSignatory != 0, "signatory is invalid");
        require(counterSignatory == counterSignatories[holder], "signatory is not a valid countersignatory");
        usedHashes[hash] = true;
    }

    /**
     * This generates the hash for the counter-signature
     */
    function hashForCounterSignature(address token, address operator, address holder, address recipient, uint256 amount, bytes data) public view returns (bytes32) {
        return keccak256(abi.encodePacked(token, address(this), operator, holder, recipient, amount, data));
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
