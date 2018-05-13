pragma solidity ^0.4.21;

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
 *        Managed provides full lifecycle management for contracts.  A managed
 *        contract provides a number of benefits.  The primary one is reducing
 *        the number of failed transactions by providing information about the
 *        state of the contract prior to sending transactions.  This cuts down
 *        on unnecessary network operations as well as reducing funds lost to
 *        transactions that will not complete successfully.
 *  
 *        The managed contract also allows contracts to be superceded by new
 *        versions in a way that gives end users the chance to find out how to
 *        access the new version of the contract, leading to easier maintenance.
 *
 *        The lifecycle of a managed contract is a simple state machine.  The
 *        possible states are:
 *          - deployed: contract has been deployed but is inoperational.  No
 *                      transactions should be made against this contract.
 *          - active: contract is running normally.  Transactions can be made
 *                    normally against this contract.
 *          - paused: contract has paused operations.  Transactions sent to
 *                    this contract will be rejected.  Use `pausedUntil()` to
 *                    obtain the time at which the contract is expected to be
 *                    unpaused.
 *          - upgraded: contract has been upgraded.  No transactions should be
 *                      made against this contract.
 *                      Use `supercededBy()` to obtain the address of the
 *                      contract that should be used instead (if any)
 *          - retired: contract is no longer in operation.  No transactions
 *                     should be made against this contract.
 *                     Use `supercededBy()` to obtain the address of the
 *                     contract that should be used instead (if any)
 *
 *        Use of the contract is through two features: modifiers and functions.
 *        There are four modifiers available: ifInState(), ifInEitherState(),
 *        ifNotInState() and ifNotInEitherState().  Every function of a managed
 *        contract, including constrant functions, should have one or more of
 *        these modifiers.
 *
 *        Functions are used to move the contract from one managed state to
 *        another.  Most of the functions are self-explanatory, but the
 *        upgrade functions are worth looking at more closely.  Upgrading
 *        consists of three steps: pre-upgrade, upgrade and post-upgrade.
 *
 *        The purpose of the pre-upgrade is to set the superceding contract up
 *        so that it has the same abilities as the current contract.  This
 *        most commonly involves setting up permissions on subsidiary contracts.
 *
 *        The purpose of the upgrade is to stop the operation of the current
 *        contract.  It will set the state of the contract to 'upgraded' to
 *        allow the contract to alter which functions will work.  It is
 *        expected that an upgraded contract will refuse to operate after this
 *        point.
 *
 *        Post-upgrade has two possibilities: commit the upgrade or revert it.
 *        The usual path will be to commit the upgrade, at which point the
 *        contract enters the 'retired' state and should do nothing other than
 *        inform requesting contracts of the state and the address of the
 *        superceding contract.
 *
 *        The second possibility is that the upgrade has given an undesired
 *        result and needs to be reverted.  Reverting the upgrade returns the
 *        contract to the active state and removes any permissions granted to
 *        the was-superceding contract.
 *
 *        For each of the upgrade functions it is expected that implementing
 *        contracts will have their own versions, in which case it is
 *        important to remember that they should remember to call the super
 *        functions.
 *
 *        Changing the state of the contract requires the caller to have the
 *        PERM_MANAGE_LIFECYCLE permission.
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
contract Managed is Permissioned {
    // The possible states of a managed contract
    enum State {
        Deployed,
        Active,
        Paused,
        Upgraded,
        Retired
    }

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
     * @dev allow actions only if the contract is in either of two given states
     */
    modifier ifInEitherState(State _state1, State _state2) {
        require(currentState == _state1 || currentState == _state2);
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
     * @dev allow actions only if the contract is not in either of two given states
     */
    modifier ifNotInEitherState(State _state1, State _state2) {
        require(currentState != _state1 && currentState != _state2);
        _;
    }

    /**
     * @dev Managed constructor.  Set the state to deployed.
     */
    constructor() public {
        currentState = State.Deployed;
    }

    /**
     * @dev Move contract from the 'testing' state to the 'active' state
     */
    function activate() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Deployed) {
        currentState = State.Active;
        emit StateChange(State.Active);
    }

    /**
     * @dev Move contract from the 'active' state to the 'paused' state
     * @param _pausedUntil the expected time at which the contract will be
     *        unpaused.
     */
    function pause(uint256 _pausedUntil) public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        currentState = State.Paused;
        pausedUntil = _pausedUntil;
        emit StateChange(State.Paused);
        emit PausedUntil(pausedUntil);
    }

    /**
     * @dev Update the expected time at which the contract will be unpaused
     * @param _pausedUntil the expected time at which the contract will be
     *        unpaused.
     */
    function setPausedUntil(uint256 _pausedUntil) public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Paused) {
        require(_pausedUntil > block.timestamp);
        pausedUntil = _pausedUntil;
        emit PausedUntil(pausedUntil);
    }

    /**
     * @dev Move contract from the 'paused' state to the 'active' state
     */
    function unpause() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Paused) {
        currentState = State.Active;
        pausedUntil = 0;
        emit StateChange(State.Active);
    }

    /**
     * @dev Move contract from the 'active' state to the 'retired' state
     */
    function retire() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        currentState = State.Retired;
        emit StateChange(State.Retired);
    }

    /**
     * @dev Carry out procedures prior to upgrading.
     *      This carries out preparation work before an upgrade takes place.
     * @param _supercededBy the address of the contract that will supercede
     *        this one.
     */
    function preUpgrade(address _supercededBy) public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        // Retain the address of the new contract
        supercededBy = _supercededBy;
    }

    /**
     * @dev Upgrade.
     *      This carries out the upgrade to the new contract.
     */
    function upgrade() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Active) {
        require(supercededBy != 0);
        // Mark this contract as upgraded
        currentState = State.Upgraded;
        emit StateChange(State.Upgraded);
        emit SupercededBy(supercededBy);
    }

    /**
     * @dev commitUpgrade.
     *      This finalises the upgrade; after this it cannot be reverted.
     */
    function commitUpgrade() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Upgraded) {
        // Mark this contract as retired
        currentState = State.Retired;
        emit StateChange(State.Retired);
    }

    /**
     * @dev Revert an upgrade
     *      This should only be called after 'upgrade'
     */
    function revertUpgrade() public ifPermitted(msg.sender, PERM_MANAGE_LIFECYCLE) ifInState(State.Upgraded) {
        currentState = State.Active;
        supercededBy = 0;
        emit StateChange(State.Active);
    }
}
