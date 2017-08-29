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

import "../auth/Owned.sol";


/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 * Based on the Open Zeppelin Pausable
 */
contract Pausable is Owned {
    event Pause();
    event Unpause();

    bool public paused = false;

    /**
     * @dev modifier to allow actions only when the contract IS paused
     */
    modifier ifNotPaused() {
        require(!paused);
        _;
    }

    /**
     * @dev modifier to allow actions only when the contract IS NOT paused
     */
    modifier ifPaused {
        require(paused);
        _;
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() public ifContractOwner ifNotPaused returns (bool) {
        paused = true;
        Pause();
        return true;
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() public ifContractOwner ifPaused returns (bool) {
        paused = false;
        Unpause();
        return true;
    }
}
