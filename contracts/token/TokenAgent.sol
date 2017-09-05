pragma solidity ^0.4.11;

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

import './ERC20.sol';


/**
 * @title TokenAgent
 *        TokenAgent is an abstract contract that issues tokens from an ERC-20
 *        source.
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract TokenAgent {
    // The token being sold
    ERC20 token;

    /**
     * @dev active states if the agent is currently active.
     */ 
    function active() public constant returns (bool);

    /**
     * @dev provide the number of tokens available.
     */
    function tokensAvailable() public constant returns (uint256);
}
