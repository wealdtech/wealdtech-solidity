pragma solidity ^0.5.0;

// Copyright © 2017, 2018 Weald Technology Trading Limited
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
import './ITokenStore.sol';


/**
 * @title SimpleTokenStore
 *        SimpleTokenStore provides storage for an ERC-20 contract separate from
 *        the contract itself.  This separation of token logic and storage
 *        allows upgrades to token functionality without requiring expensive
 *        copying of the token allocation information.
 * 
 *        Calling functions that alter the token distribution require the caller
 *        to have the PERM_ACT permission.
 *
 *        Note that this contract is aggressively ERC-20 non-compliant, to avoid
 *        any confusion that this might be a token contract in its own right.
 *        
 *        Also note that this contract does not emit any events; that is the job
 *        of the token contract.
 *        
 *        This contract has individual permissions for each major operation.
 *        These are:
 *          - PERM_MINT: permission to mint new tokens
 *          - PERM_BURN: permission to burn existing tokens
 *          - PERM_TRANSFER: permission to transfer tokens from own holder to
 *                           another regardless of allowance
 *          - PERM_SET_ALLOWANCE: permission to set the number of tokens allowed
 *                                to be transferred from one holder to another
 *          - PERM_USE_ALLOWANCE: permission to transfer tokens from one holder
 *                                to another within the bounds of the allowance
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
contract SimpleTokenStore is ITokenStore {
    using SafeMath for uint256;

    // Keep track of balances and allowances
    mapping(address=>uint256) internal balances;
    mapping(address=>mapping(address=>uint256)) internal allowances;

    // Flag to enable/disable minting
    bool public mintingEnabled;

    // Permissions for each operation
    bytes32 internal constant PERM_MINT = keccak256("token storage: mint");
    bytes32 internal constant PERM_BURN = keccak256("token storage: burn");
    bytes32 internal constant PERM_DISBALE_MINTING = keccak256("token storage: disable minting");
    bytes32 internal constant PERM_TRANSFER = keccak256("token storage: transfer");
    bytes32 internal constant PERM_SET_ALLOWANCE = keccak256("token storage: set allowance");
    bytes32 internal constant PERM_USE_ALLOWANCE = keccak256("token storage: use allowance");

    /**
     * @dev Constructor
     *      This is usually called by a token contract.
     */
    constructor() public {
        mintingEnabled = true;
    }

    /**
     * @dev Fallback.
     *      This contract does not accept funds, so revert
     */
    function () external {
        revert();
    }

    /**
     * @dev Permanently disable minting of tokens.
     */
    function disableMinting() public ifPermitted(msg.sender, PERM_DISBALE_MINTING) {
        mintingEnabled = false;
    }

    /**
     * @dev Mint tokens and allocate them to a recipient.
     */
    function mint(address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_MINT) {
        require(mintingEnabled, "minting disabled");
        balances[_recipient] = balances[_recipient].add(_amount);
        totalSupply = totalSupply.add(_amount);
    }

    /**
     * @dev Burn tokens and remove them from the total supply
     */
    function burn(address _holder, uint256 _amount) public ifPermitted(msg.sender, PERM_BURN) {
        balances[_holder] = balances[_holder].sub(_amount);
        totalSupply = totalSupply.sub(_amount);
    }

    /**
     * @dev Transfer tokens directly from owner to recipient, bypassing
     *      allowances.
     */
    function transfer(address _owner, address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_TRANSFER) {
        balances[_owner] = balances[_owner].sub(_amount);
        balances[_recipient] = balances[_recipient].add(_amount);
    }

    /**
     * @dev Obtain a balance.
     */
    function balanceOf(address _owner) public view returns (uint256 balance) {
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
    function setAllowance(address _owner, address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_SET_ALLOWANCE) {
        require((_amount == 0) || (allowances[_owner][_recipient] == 0));

        allowances[_owner][_recipient] = _amount;
    }

    /**
     * @dev Use up some or all of an allocation of tokens.
     *      Note that this allows third-party transfer of tokens, such that
     *      if A gives B an allowance of 10 tokens it is possible for B to
     *      transfer those 10 tokens directly from A to C.
     */
    function useAllowance(address _owner, address _allowanceHolder, address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_USE_ALLOWANCE) {
        uint256 allowance = allowances[_owner][_allowanceHolder];
        balances[_owner] = balances[_owner].sub(_amount);
        balances[_recipient] = balances[_recipient].add(_amount);
        allowances[_owner][_allowanceHolder] = allowance.sub(_amount);
    }

    /**
     * @dev Obtain an allowance.
     *      Note that it is possible for the allowance to be higher than the
     *      owner's balance, so if using this information to consider if an
     *      address can pay a certain amount it is important to check using
     *      both the values obtain from this and balanceOf().
     */
    function allowanceOf(address _owner, address _recipient) public view returns (uint256) {
        return allowances[_owner][_recipient];
    }

    // Nothing to sync
    function sync(address) public {}
}
