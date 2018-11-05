pragma solidity ^0.4.18;

import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title AllowSpecifiedRecipients
 *
 *        An ERC777 tokens sender contract that only allows token transfers to
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
contract AllowSpecifiedRecipients is ERC777TokensSender, ERC820Implementer {
    // Mapping is holder=>recipient=>allowed
    mapping(address=>mapping(address=>bool)) public recipients;

    // An event emitted when a recipient is set
    event RecipientSet(address holder, address recipient);
    // An event emitted when a recipient is cleared
    event RecipientCleared(address holder, address recipient);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
     * setRecipient sets a recipient to which transfers are allowed
     */
    function setRecipient(address _recipient) public {
        recipients[msg.sender][_recipient] = true;
        emit RecipientSet(msg.sender, _recipient);
    }

    /**
     * clearRecipient removes a recipient to which transfers are allowed
     */
    function clearRecipient(address _recipient) public {
        recipients[msg.sender][_recipient] = false;
        emit RecipientCleared(msg.sender, _recipient);
    }

    function getRecipient(address _holder, address _recipient) public constant returns (bool) {
        return recipients[_holder][_recipient];
    }

    function tokensToSend(address operator, address holder, address recipient, uint256 value, bytes data, bytes operatorData) public {
        (operator, value, data, operatorData);

        require(recipients[holder][recipient], "not allowed to send to that recipient");
    }
}
