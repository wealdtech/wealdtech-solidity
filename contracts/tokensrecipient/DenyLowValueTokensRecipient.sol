pragma solidity ^0.4.18;

import '../token/ERC777TokensRecipient.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens recipient contract that denies any token transfers of less
 * than 10^18 tokens
 */
contract DenyLowValueTokensRecipient is ERC777TokensRecipient, ERC820Implementer {
    function tokensReceived(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData) public {
        (from, to, userData, operator, operatorData);
        require(amount >= 1000000000000000000);
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
