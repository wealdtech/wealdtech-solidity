pragma solidity ^0.4.18;

import '../token/ERC777TokensRecipient.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * @title DenyAll
 *  
 *        An ERC777 tokens recipient contract that refuses all tokens. Commonly
 *        used to stop an address from receiving tokens if they are unable to
 *        process them for some reason.
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
contract DenyAll is ERC777TokensRecipient, ERC820Implementer {
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
