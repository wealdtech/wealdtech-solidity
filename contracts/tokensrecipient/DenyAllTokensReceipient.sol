pragma solidity ^0.4.18;

import '../token/ERC777TokensRecipient.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens recipient contract that denies any attempt to transfer
 * tokens.
 */
contract DenyAllTokensRecipient is ERC777TokensRecipient, ERC820Implementer {
    function tokensReceived(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public {
        (from, to, value, userData, operator, operatorData);
        revert();
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
