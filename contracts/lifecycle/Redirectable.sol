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
 * @title Redirectable
 *        Redirectable provides a mechanism for contracts to be able to provide
 *        potential callees with the address of the contract that should be
 *        called instead of this one.  It is commonly used when a contract has
 *        been upgraded and should no longer be called.
 * 
 *        Calling setRedirect() requires the caller to have the PERM_REDIRECT
 *        permission.
 *
 *        State of this contract: under active development; has not been audited
 *        and may contain bugs and/or security holes. Use at your own risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Redirectable is Permissioned {
    event Redirect(address redirect);

    bytes32 public constant PERM_REDIRECT = keccak256("_redirectable");

    // The address to which calls should be redirected
    address public redirect;

    /**
     * @dev set the redirect address.
     *      This can be called multiple times to avoid chaining of this call
     *      when 
     */
    function setRedirect(address _redirect) public ifPermitted(msg.sender, PERM_REDIRECT) {
        redirect = _redirect;
        Redirect(redirect);
    }
}
