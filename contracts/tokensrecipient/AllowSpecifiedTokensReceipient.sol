pragma solidity ^0.4.18;

import '../token/ERC777TokensRecipient.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens recipient contract that only allows transfers for specified
 * token contracts
 */
contract AllowSpecifiedTokensRecipient is ERC777TokensRecipient, ERC820Implementer {
    // Mapping is user address=>token address=>allowed
    mapping(address=>mapping(address=>bool)) allowed;

    // An event emitted when an allowed token is added to the list
    event TokenAdded(address from, address token);
    // An event emitted when an allowed token is removed from the list
    event TokenRemoved(address from, address token);

    function addToken(address token) public {
        allowed[msg.sender][token] = true;
        emit TokenAdded(msg.sender, token);
    }

    function removeToken(address token) public {
        allowed[msg.sender][token] = false;
        emit TokenRemoved(msg.sender, token);
    }

    function tokensReceived(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public {
        (operator, from, value, userData, operatorData);
        require(allowed[to][msg.sender]);
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
