pragma solidity ^0.5.0;

import '../token/ERC777TokensRecipient.sol';
import '../registry/ERC1820Implementer.sol';


/**
 * @title DenyLowAmount
 *  
 *        An ERC777 tokens recipient contract that refuses receipt of transfers
 *        below a specified amount.  Commonly used to stop low-value transfers.
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
contract DenyLowAmount is ERC777TokensRecipient, ERC1820Implementer {
    // recipient=>token=>minimum amount
    mapping(address=>mapping(address=>uint256)) minimumAmounts;

    // An event emitted when a minimum transfer amount is set
    event MinimumAmountSet(address recipient, address token, uint256 amount);
    // An event emitted when a minimum transfer amount is cleared
    event MinimumAmountCleared(address recipient, address token);

    constructor() public {
        implementInterface("ERC777TokensRecipient", false);
    }

    function setMinimumAmount(address token, uint256 amount) external {
        minimumAmounts[msg.sender][token] = amount;
        emit MinimumAmountSet(msg.sender, token, amount);
    }

    function clearMinimumAmount(address token) external {
        minimumAmounts[msg.sender][token] = 0;
        emit MinimumAmountCleared(msg.sender, token);
    }

    function tokensReceived(address operator, address holder, address recipient, uint256 amount, bytes calldata data, bytes calldata operatorData) external {
        (operator, holder, data, operatorData);
        require(amount > minimumAmounts[recipient][msg.sender], "transfer value too low to be accepted");
    }
}
