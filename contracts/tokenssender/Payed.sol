pragma solidity ^0.4.18;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC820Implementer.sol';


/**
 * @title Payed
 *
 *        An ERC777 tokens sender contract that will transfer tokens as long as
 *        enough Ether is supplied with the transfer request.
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
contract Payed is ERC777TokensSender, ERC820Implementer {
    using SafeMath for uint256;

    // Mapping is token=>holder=>cost per token
    mapping(address=>mapping(address=>uint256)) costPerToken;

    event CostPerToken(address token, address holder, uint256 costPerToken);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    function setCostPerToken(address _token, uint256 _costPerToken) public {
        costPerToken[_token][msg.sender] = _costPerToken;
        emit CostPerToken(_token, msg.sender, _costPerToken);
    }

    function getCostPerToken(address _token, address _holder) public view returns (uint256) {
        return costPerToken[_token][_holder];
    }

    /**
     * This ensures that the correct value is present for the transfer
     */
    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes data, bytes operatorData) public payable {
        (operator, recipient, data, operatorData);

        require(msg.value.div(amount) == costPerToken[msg.sender][holder], "mismatch between Ether and number of tokens");
        holder.transfer(msg.value);
    }
}
