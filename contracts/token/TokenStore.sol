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

import '../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';
import '../auth/Permissioned.sol';


/**
 * @title TokenStore
 *        TokenStore provides storage for an ERC-20 contract separate from the
 *        contract itself.  This separation of token logic and storage allows
 *        upgrades to token functionality without requiring expensive copying
 *        of the token allocation information.
 * 
 *        Calling functions that alter the token distribution require the
 *        caller to have the PERM_ACT permission.
 *
 *        Note that this contract is aggressively ERC-20 non-compliant, to
 *        avoid any confusion that this might be a token contract in its own
 *        right.
 *        
 *        Also note that this contract does not emit any events.  That is the
 *        job of the token contract.
 *        
 *        This contract has individual permissions for each major operation.
 *        These are:
 *          - PERM_MINT: permission to mint new tokens
 *          - PERM_TRANSFER: permission to transfer tokens from own holder to
 *                           another regardless of allowance
 *          - PERM_SET_ALLOWANCE: permission to set the number of tokens allowed
 *                                to be transferred from one holder to another
 *          - PERM_USE_ALLOWANCE: permission to transfer tokens from one holder
 *                                to another within the bounds of the allowance
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract TokenStore is Permissioned {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address=>uint256) private balances;
    mapping(address=>mapping(address=>uint256)) private allowances;

    bytes32 private constant PERM_MINT = keccak256("token storage: mint");
    bytes32 private constant PERM_TRANSFER = keccak256("token storage: transfer");
    bytes32 private constant PERM_SET_ALLOWANCE = keccak256("token storage: set allowance");
    bytes32 private constant PERM_USE_ALLOWANCE = keccak256("token storage: use allowance");

    /**
     * @dev Constructor
     *      This is usually called by a token contract.
     */
    function TokenStore(string _name, string _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /**
     * @dev Mint tokens and allocate them to a recipient.
     */
    function mint(address recipient, uint256 _amount) ifPermitted(msg.sender, PERM_MINT) {
        balances[recipient] = balances[recipient].add(_amount);
        totalSupply = totalSupply.add(_amount);
    }

    /**
     * @dev Transfer tokens directly from owner to recipient, bypassing
     *      allowances.
     */
    function transfer(address owner, address recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_TRANSFER) {
        balances[owner] = balances[owner].sub(_amount);
        balances[recipient] = balances[recipient].add(_amount);
    }

    /**
     * @dev Obtain a balance.
     */
    function balanceOf(address _owner) public constant returns (uint256 balance) {
        return balances[_owner];
    }

    /**
     * @dev Set an allowance for a (sender, recipient) pair
     *      The amount of funds must not be more than the sender's current
     *      balance.
     *      Note that it is not permitted to change an allocation from a
     *      non-zero number to another non-zero number, due to potential race
     *      conditions with transactions.  Allocations must always go from
     *      zero to non-zero, or non-zero to zero.
     */
    function setAllowance(address sender, address recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_SET_ALLOWANCE) {
        require((_amount == 0) || (allowances[sender][recipient] == 0));

        // Ensure the sender is not allocating more funds than they have.
        require(_amount <= balances[sender]);

        allowances[sender][recipient] = _amount;
    }

    /**
     * @dev Use up some or all of an allocation of tokens.
     *      Note that this allows third-party transfer of tokens, such that
     *      if A gives B an allowance of 10 tokens it is possible for B to
     *      transfer those 10 tokens directly from A to C.
     */
    function useAllowance(address owner, address allowanceHolder, address recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_USE_ALLOWANCE) {
        var allowance = allowances[owner][allowanceHolder];
        balances[owner] = balances[owner].sub(_amount);
        balances[recipient] = balances[recipient].add(_amount);
        allowances[owner][allowanceHolder] = allowance.sub(_amount);
    }

    /**
     * @dev Obtain an allowance.
     *      Note that it is possible for the allowance to be higher than the
     *      owner's balance, so if using this information to consider if an
     *      address can pay a certain amount it is important to check using
     *      both the values obtain from this and balanceOf().
     */
    function allowanceOf(address owner, address recipient) public constant returns (uint256) {
        return allowances[owner][recipient];
    }
}
