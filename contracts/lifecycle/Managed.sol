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
 * @title Managed
 *        Managed provides full lifecycle management for contracts.
 *
 *        A managed contract provides a number of benefits.  The primary one is
 *        reducing the number of failed transactions by providing information
 *        about the state of the contract prior to sending transactions.  This
 *        cuts down on unnecessary network operations as well as reducing funds
 *        lost to transactions that will not complete successfully.
 *  
 *        The managed contract also allows contracts to be superceded by new
 *        versions in a way that gives end users the chance to find out how to
 *        access the new version of the contract, leading to easier maintenance.
 *
 *        The lifecycle of a managed contract is a simple state machine. 
 *          - deploy - contract has been deployed but is inoperational.  No transactions should be made against this contract.
 *          - test - contract is undergoing tests.  No transactions of high value should be made against this contract.
 *          - active - contract is running normally.  Transactions can be made normally against this contract
 *          - paused - contract has paused operations.  Transactions can be made normally against this contract.  Use `pausedUntil()` to obtain time time when the contract is expected to be unpaused
 *          - superceded - contract has been superceded by a new contract.  No transactions should be made against this contract.  Use `supercededBy()` to obtain the address of the contract that should be used instead
 *          - retired - contract is no longer in operation.  No transactions should be made against this contract.
 *
 *        pausedUntil() - the time when the contract is expected to be unpaused
 *        supercededBy() - the address of the contract to use instead of this
 *
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
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Managed is Permissioned {
    // The possible states of a managed contract
    enum State { Deployed, Testing, Active, Paused, Superceded, Retired }

    // The current state of the contract
    State public currentState;

    // The time at which a paused contract is expected to be available again
    uint256 public pausedUntil;

    // The address of the contract that has superceded this contract
    address public supercededBy;

    // Event emitted whenever the contract's state changes
    event StateChange(State state);
    event PausedUntil(uint256 until);
    event SupercededBy(address by);

    // Permissions
    bytes32 internal constant PERM_MANAGE_LIFECYCLE = keccak256("managed: manage lifecycle");

    // Modifiers

    /**
     * @dev allow actions only if the contract is in a given state
     */
    modifier ifInState(State _state) {
        require(currentState == _state);
        _;
    }

    /**
     * @dev allow actions only if the contract is not in a given state
     */
    modifier ifNotInState(State _state) {
        require(currentState != _state);
        _;
    }

    /**
     * @dev Managed constructor.  Set the state to deployed.
     */
    function Managed() {
        currentState = State.Deployed;
    }

    /**
     * @dev Move contract from the 'deployed' state to the 'testing' state
     */
    function deployedToTesting() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Deployed) {
        currentState = State.Testing;
    }

    /**
     * @dev Move contract from the 'testing' state to the 'active' state
     */
    function testingToActive() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Testing) {
        currentState = State.Active;
    }

    /**
     * @dev Move contract from the 'active' state to the 'paused' state
     */
    function activeToPaused(uint256 _pausedUntil) public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        currentState = State.Paused;
        pausedUntil = _pausedUntil;
    }

    /**
     * @dev Move contract from the 'paused' state to the 'active' state
     */
    function pausedToActive() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Paused) {
        currentState = State.Active;
        pausedUntil = 0;
    }

    /**
     * @dev Move contract to the 'active' state from the 'superceded' state
     */
    function activeToSuperceded(address _supercededBy) public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        currentState = State.Superceded;
        supercededBy = _supercededBy;
    }

    /**
     * @dev Move contract to the 'active' state from the 'paused' state
     */
    function activeToRetired() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        currentState = State.Retired;
    }
}
