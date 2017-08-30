pragma solidity ^0.4.11;

// Copyright © 2017 Jim McDonald
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

import './TokenAgent.sol';
import '../../node_modules/zeppelin-solidity/contracts/token/ERC20.sol';
import '../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';


/**
 * @title FaucetAgent
 * A simple agent that sells all tokens that it has at a fixed exchange
 * rate
 */
contract FaucetAgent is TokenAgent {
    using SafeMath for uint256;

    // The token that the agent is selling
    ERC20 token;

    // The number of tokens per Wei.
    uint256 tokensPerWei;

    function FaucetAgent(ERC20 _token, uint256 _tokensPerWei) {
        token = _token;
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
        return token.balanceOf(this);
    }

    /**
     * @dev attempt to obtain tokens depending on the amount of funds
     * supplied.
     */
    function () public payable {
        var amount = msg.value.mul(tokensPerWei);
        require(amount > 0);
        token.transfer(msg.sender, amount);
    }
}
