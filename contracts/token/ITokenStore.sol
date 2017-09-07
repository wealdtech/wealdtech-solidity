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

import '../auth/Permissioned.sol';


/**
 * @title ITokenStore
 *        ITokenStore is the interface for storing tokens as part of a token
 *        contract.
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract ITokenStore is Permissioned {

    // Common variables for all token stores
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    /**
     * @dev Mint tokens and allocate them to a recipient.
     */
    function mint(address _recipient, uint256 _amount) public;

    /**
     * @dev Transfer tokens directly from owner to recipient, bypassing
     *      allowances.
     */
    function transfer(address _owner, address _recipient, uint256 _amount) public;

    /**
     * @dev Obtain a balance.
     */
    function balanceOf(address _owner) public constant returns (uint256);

    /**
     * @dev Set an allowance for a (sender, recipient) pair
     *      The amount of funds must not be more than the sender's current
     *      balance.
     *      Note that it is not permitted to change an allocation from a
     *      non-zero number to another non-zero number, due to potential race
     *      conditions with transactions.  Allocations must always go from
     *      zero to non-zero, or non-zero to zero.
     */
    function setAllowance(address _sender, address _recipient, uint256 _amount) public;

    /**
     * @dev Use up some or all of an allocation of tokens.
     *      Note that this allows third-party transfer of tokens, such that
     *      if A gives B an allowance of 10 tokens it is possible for B to
     *      transfer those 10 tokens directly from A to C.
     */
    function useAllowance(address _owner, address _allowanceHolder, address _recipient, uint256 _amount) public;

    /**
     * @dev Obtain an allowance.
     *      Note that it is possible for the allowance to be higher than the
     *      owner's balance, so if using this information to consider if an
     *      address can pay a certain amount it is important to check using
     *      both the values obtain from this and balanceOf().
     */
    function allowanceOf(address _owner, address _recipient) public constant returns (uint256);

    /**
     * @dev Add a token dividend.
     *      A token dividend is a number of tokens transferred from an owner
     *      to be shared amongst all existing token holders in proportion to
     *      their existing holdings.
     */
//    function addTokenDividend(address _owner, uint256 _amount) public;

    /**
     * @dev Synchronise the data for an account.
     *      This function must be called before any operation to view or alter
     *      the named account is undertaken, otherwise users risk obtaining
     *      incorrect information.
     */
    function sync(address _account) public;
}
