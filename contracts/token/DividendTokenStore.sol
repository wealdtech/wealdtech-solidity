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

import '../math/SafeMath.sol';
import './ITokenStore.sol';


/**
 * @title DividendTokenStore
 *        DividendTokenStore is an enhancement of the SimpleTokenStore that
 *        provides the ability to issue token-based dividends in an efficient
 *        manner.
 *
 *        This contract has individual permissions for each major operation.
 *        In addition to those in SimpleTokenStore these are:
 *          - PERM_ISSUE_DIVIDEND: permission to issue a dividend
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract DividendTokenStore is ITokenStore {
    using SafeMath for uint256;

    // Account keeps track of user information regarding the token
    struct Account {
        uint256 balance;
        uint256 nextDividend;
        mapping(address=>uint256) allowances;
    }
    mapping(address=>Account) private accounts;

    // Dividend tracks the number of tokens issued in the dividend and the
    // supply at the time (minus the dividend itself)
    struct Dividend {
        uint256 amount;
        uint256 supply;
    }
    Dividend[] private dividends;
    address private DIVIDEND_ADDRESS = 0x01;

    // Permissions for each operation
    bytes32 private constant PERM_MINT = keccak256("token storage: mint");
    bytes32 private constant PERM_TRANSFER = keccak256("token storage: transfer");
    bytes32 private constant PERM_SET_ALLOWANCE = keccak256("token storage: set allowance");
    bytes32 private constant PERM_USE_ALLOWANCE = keccak256("token storage: use allowance");
    bytes32 private constant PERM_ISSUE_DIVIDEND = keccak256("token storage: issue dividend");

    /**
     * @dev Constructor
     *      This is usually called by a token contract.
     */
    function DividendTokenStore(string _name, string _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /**
     * @dev Fallback
     *      This contract does not accept funds, so revert
     */
    function () public payable {
        revert();
    }

    /**
     * @dev Mint tokens and allocate them to a recipient.
     */
    function mint(address _recipient, uint256 _amount) ifPermitted(msg.sender, PERM_MINT) {
        accounts[_recipient].balance = accounts[_recipient].balance.add(_amount);
        totalSupply = totalSupply.add(_amount);
    }

    /**
     * @dev Transfer tokens directly from owner to recipient, bypassing
     *      allowances.
     */
    function transfer(address _owner, address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_TRANSFER) {
        accounts[_owner].balance = accounts[_owner].balance.sub(_amount);
        accounts[_recipient].balance = accounts[_recipient].balance.add(_amount);
    }

    /**
     * @dev Obtain a balance.
     */
    function balanceOf(address _owner) public constant returns (uint256 balance) {
        return accounts[_owner].balance;
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
        require((_amount == 0) || (accounts[_owner].allowances[_recipient] == 0));

        // Ensure the sender is not allocating more funds than they have.
        require(_amount <= accounts[_owner].balance);

        accounts[_owner].allowances[_recipient] = _amount;
    }

    /**
     * @dev Use up some or all of an allocation of tokens.
     *      Note that this allows third-party transfer of tokens, such that
     *      if A gives B an allowance of 10 tokens it is possible for B to
     *      transfer those 10 tokens directly from A to C.
     */
    function useAllowance(address _owner, address _allowanceHolder, address _recipient, uint256 _amount) public ifPermitted(msg.sender, PERM_USE_ALLOWANCE) {
        accounts[_owner].balance = accounts[_owner].balance.sub(_amount);
        accounts[_recipient].balance = accounts[_recipient].balance.add(_amount);
        accounts[_owner].allowances[_allowanceHolder] = accounts[_owner].allowances[_allowanceHolder].sub(_amount);
    }

    /**
     * @dev Obtain an allowance.
     *      Note that it is possible for the allowance to be higher than the
     *      owner's balance, so if using this information to consider if an
     *      address can pay a certain amount it is important to check using
     *      both the values obtain from this and balanceOf().
     */
    function allowanceOf(address _owner, address _recipient) public constant returns (uint256) {
        return accounts[_owner].allowances[_recipient];
    }

    /**
     * @dev obtain the dividend(s) owing to a given account.
     */
    function dividendsOwing(address _account) internal returns(uint256) {
        uint256 initialBalance = accounts[_account].balance;
        uint256 balance = initialBalance;
        // Iterate over all outstanding dividends
        var nextDividend = accounts[_account].nextDividend;
        for (uint256 currentDividend = nextDividend; currentDividend < dividends.length; currentDividend++) {
            balance += balance * dividends[currentDividend].amount / dividends[currentDividend].supply;
        }

        return balance - initialBalance;
    }

    /**
     * @dev Synchronise the account details.
     *      Sync must be called by a modifier for any function that looks at or
     *      changes details of an account, even if that function is constant.
     * @param _account the account for which to synchronise the balance.
     */
    function sync(address _account) public {
        var accountDividend = dividendsOwing(_account);
        if (accountDividend > 0) {
            transfer(DIVIDEND_ADDRESS, _account, accountDividend);
            accounts[_account].nextDividend = dividends.length;
        }
    }

    /**
     * @dev issue a dividend.
     *      This issues a dividend from the given sender for the given amount.
     *      It shared the amount out fairly between all participants.
     */
    function issueDividend(address _sender, uint256 _amount) public ifPermitted(msg.sender, PERM_ISSUE_DIVIDEND) {
        dividends.push(Dividend({amount: _amount, supply: totalSupply - _amount}));
        transfer(_sender, DIVIDEND_ADDRESS, _amount);
    }
}
