pragma solidity ^0.4.23;

// Copyright © 2017 Weald Technology Trading Limited
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import '../math/SafeMath.sol';
import './ITokenAgent.sol';
import './IERC20.sol';


/**
 * @title FixedPriceTokenAgent
 *        A simple token agent that sells its tokens at a fixed exchange rate
 *        of Ether to tokens.
 *
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract FixedPriceTokenAgent is ITokenAgent {
    using SafeMath for uint256;

    // The token being sold
    IERC20 token;

    // The provider of the tokens we are selling
    address provider;

    // The number of tokens per Wei.
    uint256 tokensPerWei;

    constructor(IERC20 _token, address _provider, uint256 _tokensPerWei) public {
        token = _token;
        provider = _provider;
        require(_tokensPerWei > 0);
        tokensPerWei = _tokensPerWei;
    }

    /**
     * @dev active states if the agent is currently active.
     */ 
    function active() public constant returns (bool) {
        return tokensAvailable() > 0;
    }

    /**
     * @dev provide the number of tokens available.
     */
    function tokensAvailable() public constant returns (uint256) {
        return token.allowance(provider, address(this));
    }

    /**
     * @dev attempt to obtain tokens depending on the amount of funds
     * supplied.
     */
    function () public payable {
        uint256 amount = msg.value.mul(tokensPerWei);
        require(amount > 0);
        require(amount <= tokensAvailable());
        token.transferFrom(provider, msg.sender, amount);
    }
}
