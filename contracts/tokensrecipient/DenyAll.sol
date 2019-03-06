pragma solidity ^0.5.0;

import '../token/ERC777TokensRecipient.sol';
import '../registry/ERC1820Implementer.sol';


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
contract DenyAll is ERC777TokensRecipient, ERC1820Implementer {
    constructor() public {
        implementInterface("ERC777TokensRecipient");
    }

    function tokensReceived(address operator, address from, address to, uint256 value, bytes calldata data, bytes calldata operatorData) external {
        (from, to, value, data, operator, operatorData);
        revert();
    }
}
