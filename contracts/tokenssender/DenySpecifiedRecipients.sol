pragma solidity ^0.4.18;

import '../token/ERC777TokensSender.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * @title DenySpecifiedRecipients
 *
 *        An ERC777 tokens sender contract that denies token transfers to
 *        specified recipients as provided by holders.
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
contract DenySpecifiedRecipients is ERC777TokensSender, ERC820Implementer {
    // Mapping is holder=>recipient=>denied
    mapping(address=>mapping(address=>bool)) public recipients;

    // An event emitted when a recipient is set
    event RecipientSet(address holder, address recipient);
    // An event emitted when a recipient is cleared
    event RecipientCleared(address holder, address recipient);

    /**
     * setRecipient sets a recipient to which transfers are denied
     */
    function setRecipient(address _recipient) public {
        recipients[msg.sender][_recipient] = true;
        emit RecipientSet(msg.sender, _recipient);
    }

    /**
     * clearRecipient removes a recipient to which transfers are denied
     */
    function clearRecipient(address _recipient) public {
        recipients[msg.sender][_recipient] = false;
        emit RecipientCleared(msg.sender, _recipient);
    }

    function getRecipient(address _holder, address _recipient) public constant returns (bool) {
        return recipients[_holder][_recipient];
    }

    function tokensToSend(address operator, address holder, address recipient, uint256 value, bytes holderData, bytes operatorData) public {
        (operator, value, holderData, operatorData);
        require(!recipients[holder][recipient]);
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
