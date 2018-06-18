pragma solidity ^0.4.18;

import '../token/ERC777TokensSender.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens sender contract that denies token transfers to specified
 * addresses as provided by end users
 */
contract DenySpecifiedTokensSender is ERC777TokensSender, ERC820Implementer {
    mapping(address=>mapping(address=>bool)) public denials;

    // An event emitted when a new denial is added to the list
    event DenialAdded(address from, address to);
    // An event emitted when a denial is removed from the list
    event DenialRemoved(address from, address to);

    /**
     * addDenial adds an address to which transfers are denied
     */
    function addDenial(address _address) public {
        denials[msg.sender][_address] = true;
        emit DenialAdded(msg.sender, _address);
    }

    /**
     * removeDenial removes an address to which transfers are denied
     */
    function removeDenial(address _address) public {
        denials[msg.sender][_address] = false;
        emit DenialRemoved(msg.sender, _address);
    }

    function tokensToSend(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public {
        (value, userData, operator, operatorData);
        require(!denials[from][to]);
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
