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
import './SimpleTokenStore.sol';


/**
 * @title DividendTokenStore
 *        DividendTokenStore is an enhancement of the SimpleTokenStore that
 *        provides the ability to issue token-based dividends in an efficient
 *        manner.
 *
 *        This contract has individual permissions for each major operation.
 *        In addition to those in SimpleTokenStore these are:
 *          - PERM_ISSUE_DIVIDEND: permission to issue a dividend
 *
 *        State of this contract: under active development; code and API
 *        may change.  Use at your own risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract DividendTokenStore is SimpleTokenStore {
    using SafeMath for uint256;

    // nextDividend keeps track of the next dividend for each account
    mapping(address=>uint256) private nextDividends;

    // Dividend tracks the number of tokens issued in the dividend and the
    // supply at the time (minus the dividend itself)
    struct Dividend {
        uint256 amount;
        uint256 supply;
    }
    Dividend[] private dividends;
    address private DIVIDEND_ADDRESS = 0x01;

    // Permissions for each operation
    bytes32 internal constant PERM_ISSUE_DIVIDEND = keccak256("token storage: issue dividend");

    /**
     * @dev Constructor
     *      This is usually called by a token contract.
     */
    function DividendTokenStore(string _name, string _symbol, uint8 _decimals) SimpleTokenStore(_name, _symbol, _decimals) { }

    /**
     * @dev obtain the dividend(s) owing to a given account.
     */
    function dividendsOwing(address _account) internal returns(uint256) {
        uint256 initialBalance = balances[_account];
        uint256 balance = initialBalance;
        // Iterate over all outstanding dividends
        var nextDividend = nextDividends[_account];
        for (uint256 currentDividend = nextDividend; currentDividend < dividends.length; currentDividend++) {
            balance = balance.add(balance.mul(dividends[currentDividend].amount).div(dividends[currentDividend].supply));
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
            nextDividends[_account] = dividends.length;
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
