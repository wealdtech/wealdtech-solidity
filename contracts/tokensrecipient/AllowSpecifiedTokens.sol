pragma solidity ^0.4.18;

import '../token/ERC777TokensRecipient.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * @title AllowSpecifiedTokens
 *  
 *        An ERC777 tokens recipient contract that only allows receipt from
 *        specified token contracts.  Commonly used to keep "clean" addresses
 *        which cannot be targets of air drops etc. without permission.
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
contract AllowSpecifiedTokens is ERC777TokensRecipient, ERC820Implementer {
    // Mapping is recipient=>token=>allowed
    mapping(address=>mapping(address=>bool)) allowed;

    // An event emitted when an allowed token is added to the list
    event TokenAdded(address recipient, address token);
    // An event emitted when an allowed token is removed from the list
    event TokenRemoved(address recipient, address token);

    function addToken(address token) public {
        allowed[msg.sender][token] = true;
        emit TokenAdded(msg.sender, token);
    }

    function removeToken(address token) public {
        allowed[msg.sender][token] = false;
        emit TokenRemoved(msg.sender, token);
    }

    function tokensReceived(address operator, address holder, address recipient, uint256 amount, bytes holderData, bytes operatorData) public {
        (operator, holder, amount, holderData, operatorData);
        require(allowed[recipient][msg.sender]);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) pure public returns(bytes32) {
        (addr);
        if (interfaceHash == keccak256("ERC777TokensRecipient")) {
            return keccak256("ERC820_ACCEPT_MAGIC");
        } else {
            return 0;
        }
    }
}
