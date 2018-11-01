pragma solidity ^0.4.24;

import '../math/SafeMath.sol';
import '../token/IERC777.sol';


/**
 * @title FixedPriceSeller
 *
 *        An ERC777 token operator contract that sells tokens at a fixed price.
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
contract FixedPriceSeller {
    using SafeMath for uint256;

    // Mapping is token=>holder=>cost per token
    mapping(address=>mapping(address=>uint256)) costPerToken;

    event CostPerToken(address token, address holder, uint256 costPerToken);

    function setCostPerToken(address _token, uint256 _costPerToken) public {
        costPerToken[_token][msg.sender] = _costPerToken;
        emit CostPerToken(_token, msg.sender, _costPerToken);
    }

    function getCostPerToken(address _token, address _holder) public view returns (uint256) {
        return costPerToken[_token][_holder];
    }

    /**
     * Sell tokens from a holder at their price
     */
    function sell(address _token, address _holder) public payable {
        require(costPerToken[_token][_holder] != 0, "not for sale");
        uint256 amount = msg.value.div(costPerToken[_token][_holder]);
        require(amount > 0, "not enough ether paid");
        uint256 value = amount.mul(costPerToken[_token][_holder]);
        require(value == msg.value, "non-integer number of tokens purchased");

        IERC777(_token).operatorSend(_holder, msg.sender, amount, "", "");
        _holder.transfer(msg.value);
    }
}
