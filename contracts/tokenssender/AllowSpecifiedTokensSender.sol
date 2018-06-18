pragma solidity ^0.4.18;

import '../token/ERC777TokensSender.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens sender contract that only allows token transfers to
 * specified addresses as provided by end users
 */
contract AffirmSpecifiedTokensSender is ERC777TokensSender, ERC820Implementer {
    mapping(address=>mapping(address=>bool)) public affirmations;

    // An event emitted when a new affirmation is added to the list
    event AffirmationAdded(address from, address to);
    // An event emitted when an affirmation is removed from the list
    event AffirmationRemoved(address from, address to);

    /**
     * addAffirmation adds an address to which transfers are denied
     */
    function addAffirmation(address _address) public {
        affirmations[msg.sender][_address] = true;
        emit AffirmationAdded(msg.sender, _address);
    }

    /**
     * removeAffirmation removes an address to which transfers are denied
     */
    function removeAffirmation(address _address) public {
        affirmations[msg.sender][_address] = false;
        emit AffirmationRemoved(msg.sender, _address);
    }

    function tokensToSend(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public {
        (value, userData, operator, operatorData);
        require(affirmations[from][to]);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) pure public returns(bytes32) {
        (addr);
        if (interfaceHash == keccak256("ERC777TokensSender")) {
            return keccak256("ERC820_ACCEPT_MAGIC");
        } else {
            return 0;
        }   
    }
}
