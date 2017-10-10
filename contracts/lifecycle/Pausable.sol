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

import "../auth/Permissioned.sol";


/**
 * @title Pausable
 *        Pausable provides a toggle for the operation of contract functions.
 *        This is accomplished through a combination of functions and
 *        modifiers.  The functions pause() and unpause() toggle the internal
 *        flag, and the modifiers ifPaused and ifNotPaused throw if the flag
 *        is not in the correct state.
 * 
 *        Calling pause() and unpause() requires the caller to have the
 *        PERM_PAUSE permission.
 *
 *        Note that an attempt to pause() an already-paused contract, or to
 *        unpause() an unpaused contract, will throw.
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
contract Pausable is Permissioned {
    event Pause();
    event Unpause();

    bool public paused = false;

    bytes32 internal constant PERM_PAUSE = keccak256("_pausable");

    /**
     * @dev modifier to continue only if the contract is not paused
     */
    modifier ifNotPaused() {
        require(!paused);
        _;
    }

    /**
     * @dev modifier to continue only if the contract is paused
     */
    modifier ifPaused {
        require(paused);
        _;
    }

    /**
     * @dev pause the contract
     */
    function pause() public ifPermitted(msg.sender, PERM_PAUSE) ifNotPaused returns (bool) {
        paused = true;
        Pause();
        return true;
    }

    /**
     * @dev unpause the contract
     */
    function unpause() public ifPermitted(msg.sender, PERM_PAUSE) ifPaused returns (bool) {
        paused = false;
        Unpause();
        return true;
    }
}
