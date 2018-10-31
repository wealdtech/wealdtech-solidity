pragma solidity ^0.4.24;

import '../token/ERC777TokensRecipient.sol';
import '../token/IERC777.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title Forwarder
 *  
 *        An ERC777 tokens recipient contract that forwards tokens to another
 *        address.  Commonly used to forward received tokens to an aggregate
 *        store, for example an exchange could forward deposited tokens directly
 *        to cold storage.
 *
 *        Note that because this contract transfers token on behalf of the
 *        recipient it requires operator privileges.
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
contract Forwarder is ERC777TokensRecipient, ERC820Implementer {
    // recipient=>target
    mapping(address=>address) public forwardingAddresses;

    // An event emitted when a forwarding address is set
    event ForwardingAddressSet(address recipient, address target);
    // An event emitted when a forwarding address is cleared
    event ForwardingAddressCleared(address recipient);

    constructor() public {
        implementInterface("ERC777TokensRecipient");
    }

    function setForwarder(address target) public {
        forwardingAddresses[msg.sender] = target;
        emit ForwardingAddressSet(msg.sender, target);
    }

    function clearForwarder() public {
        delete(forwardingAddresses[msg.sender]);
        emit ForwardingAddressCleared(msg.sender);
    }

    function getForwarder(address target) public constant returns (address) {
        return forwardingAddresses[target];
    }

    /**
     * tokensReceived forwards the token if a forwarder is set.
     */
    function tokensReceived(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public {
        (operator, holder, data, operatorData);
        if (forwardingAddresses[recipient] != 0) {
            IERC777 tokenContract = IERC777(msg.sender);
            // Transfer the tokens - this throws if it fails
            tokenContract.operatorSend(recipient, forwardingAddresses[recipient], amount, "", "");
        }
    }
}
