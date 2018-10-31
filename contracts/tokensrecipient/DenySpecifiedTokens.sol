pragma solidity ^0.4.24;

import '../token/ERC777TokensRecipient.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title DenySpecifiedTokens
 *  
 *        An ERC777 tokens recipient contract that denies receipt from
 *        specified token contracts.  Commonly used to reject "junk" tokens.
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
contract DenySpecifiedTokens is ERC777TokensRecipient, ERC820Implementer {
    // Mapping is recipient=>token=>disallowed
    mapping(address=>mapping(address=>bool)) disallowed;

    // An event emitted when a disallowed token is added to the list
    event TokenAdded(address recipient, address token);
    // An event emitted when a disallowed token is removed from the list
    event TokenRemoved(address recipient, address token);

    constructor() public {
        implementInterface("ERC777TokensRecipient");
    }

    /**
     * Add a token to the list of tokens that this address will refuse.
     */
    function addToken(address token) public {
        disallowed[msg.sender][token] = true;
        emit TokenAdded(msg.sender, token);
    }

    /**
     * Remove a token from the list of tokens that this address will refuse.
     */
    function removeToken(address token) public {
        disallowed[msg.sender][token] = false;
        emit TokenRemoved(msg.sender, token);
    }

    function tokensReceived(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public {
        (operator, holder, amount, data, operatorData);
        require(!disallowed[recipient][msg.sender], "token is explicitly disallowed");
    }
}
