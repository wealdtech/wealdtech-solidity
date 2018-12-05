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
import './SimpleTokenStore.sol';


/**
 * @title DividendTokenStore
 *        DividendTokenStore is an enhancement of the SimpleTokenStore that
 *        provides the ability to issue token-based dividends in an efficient
 *        manner.
 *
 *        The dividend token store allows multiple dividends to be added. Each
 *        dividend is defined by the number of tokens to be shared between the
 *        exisiting token holders (including the holder who issued the dividend)
 *        on a pro rata basis, and the total supply of tokens (minus dividends)
 *        at the time the dividend was issued.
 *
 *        Outstanding dividends are added to balances whenever that balance is
 *        addressed, ensuring that balances are always up-to-date whilst
 *        reducing the number of transactions required to do so to a minimum.
 *
 *        This contract has individual permissions for each major operation.
 *        In addition to those in SimpleTokenStore these are:
 *          - PERM_ISSUE_DIVIDEND: permission to issue a dividend
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
    // The address holding dividends that have yet to be paid out
    address private DIVIDEND_ADDRESS = address(0x01);

    // Permissions for each operation
    bytes32 internal constant PERM_ISSUE_DIVIDEND = keccak256("token storage: issue dividend");

    /**
     * @dev obtain the dividend(s) owing to a given account.
     */
    function dividendsOwing(address _account) internal view returns(uint256) {
        uint256 initialBalance = balances[_account];
        uint256 balance = initialBalance;
        // Iterate over all outstanding dividends
        uint256 nextDividend = nextDividends[_account];
        for (uint256 currentDividend = nextDividend; currentDividend < dividends.length; currentDividend++) {
            balance = balance.add(balance.mul(dividends[currentDividend].amount).div(dividends[currentDividend].supply));
        }

        return balance - initialBalance;
    }

    /**
     * @dev Synchronise the data for an account.
     *      This function must be called before any non-constant operation to
     *      view or alter the named account is undertaken, otherwise users risk
     *      obtaining incorrect information.
     * @param _account The account to synchronise
     */
    function sync(address _account) public {
        uint256 accountDividend = dividendsOwing(_account);
        if (accountDividend > 0) {
            transfer(DIVIDEND_ADDRESS, _account, accountDividend);
            nextDividends[_account] = dividends.length;
        }
    }

    /**
     * @dev Obtain a balance.
     */
    function balanceOf(address _account) public view returns (uint256 balance) {
        return balances[_account] + dividendsOwing(_account);
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
