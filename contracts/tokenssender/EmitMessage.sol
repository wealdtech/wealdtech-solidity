pragma solidity ^0.4.24;

import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title EmitMessage
 *
 *        An ERC777 tokens sender contract that provides an additional event
 *        with holder-defined message on transfer.
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
contract EmitMessage is ERC777TokensSender, ERC820Implementer {
    // Holder=>recipient=>log
    mapping(address=>mapping(address=>string)) public messages;

    // An event emitted when a message is set
    event MessageSet(address holder, address recipient, string message);
    // An event emitted when a message is cleared
    event MessageCleared(address holder, address recipient);
    // The event that is emitted to log a message
    event Message(address holder, address recipient, string message);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
     * setMessage sets a message.  If recipient is 0 then this message will
     * apply for all sends from this holder.
     */
    function setMessage(address _recipient, string _message) public {
        messages[msg.sender][_recipient] = _message;
        emit MessageSet(msg.sender, _recipient, _message);
    }

    /**
     * ClearMessage clears a message.
     */
    function clearMessage(address _recipient) public {
        messages[msg.sender][_recipient] = "";
        emit MessageCleared(msg.sender, _recipient);
    }

    function getMessage(address _holder, address _recipient) public constant returns (string) {
        return messages[_holder][_recipient];
    }

    /**
     * Emit a message if found
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public payable {
        (operator, amount, data, operatorData);

        require(msg.value == 0, "ether not accepted");

        string memory message = messages[holder][recipient];
        if (bytes(message).length > 0) {
            emit Message(holder, recipient, message);
        } else {
            message = messages[holder][0];
            if (bytes(message).length > 0) {
                emit Message(holder, recipient, message);
            }
        }
    }
}
