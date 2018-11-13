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

    // Mapping is token=>holder=>price per token
    mapping(address=>mapping(address=>uint256)) pricePerToken;

    event PricePerToken(address token, address holder, uint256 pricePerToken);

    /**
     * Set the price for each token.  The price is in Wei, so if for example
     * the price is 1 Ether for 1 token then _pricePerToken would be 10^18.
     */
    function setPricePerToken(IERC777 _token, uint256 _pricePerToken) public {
        pricePerToken[_token][msg.sender] = _pricePerToken;
        emit PricePerToken(_token, msg.sender, _pricePerToken);
    }

    /**
     * Get the price for each token.  The price is in Wei, so if for example
     * the price is 1 Ether for 1 token this would return 10^18.
     */
    function getPricePerToken(IERC777 _token, address _holder) public view returns (uint256) {
        return pricePerToken[_token][_holder];
    }

    /**
     * Send tokens from a holder at their price
     */
    function send(IERC777 _token, address _holder) public payable {
        // N.B. need to do this here to avoid div by zero if not for sale
        require(pricePerToken[_token][_holder] != 0, "not for sale");
        uint256 amount = msg.value.mul(1000000000000000000).div(pricePerToken[_token][_holder]);
        confirmAllowed(_token, _holder, msg.value, amount);

        _token.operatorSend(_holder, msg.sender, amount, "", "");
        _holder.transfer(msg.value);
    }

    function confirmAllowed(IERC777 _token, address _holder, uint256 _value, uint256 _amount) internal view {
        // N.B. we do this here as well as in send() to allow for composition
        require(pricePerToken[_token][_holder] != 0, "not for sale");
        require(_amount > _token.granularity(), "not enough ether paid");
        uint256 value = _amount.mul(pricePerToken[_token][_holder]).div(1000000000000000000);
        require(value == _value, "non-integer number of tokens purchased");
    }
}
