pragma solidity ^0.4.23;

import './Permissioned.sol';


// Copyright © 2018 Weald Technology Trading Limited
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

/**
 * @title Authorised
 *        Authorisation is a mechanism to allow arbitrary operations to take
 *        place within a smart contract by providing a signature that can be
 *        recognised as authorising the requested action.
 *
 *        Actions are described by a contract-specific n-tuple.  At a minimum
 *        the action should include the contract, address and action identifier
 *        which it is authorising.  If the authorisation is specific to a sender
 *        then their address should be present as well.  Any other data relevant
 *        to the action should also be included.
 *
 *        The action is hashed and signed by an authoriser to produce the
 *        authorising signature.  This signature can be checked using either the
 *        modifier `ifAuthorised` or the function `authorise`.
 *
 *        Note that actions may or may not be repeatable.  An example of a
 *        repeatable action might be a right-to-use action.  An example of an
 *        unrepeatable action might be a payment action.  The authorisation
 *        checks can be used to enforce single-use or repeatble use as required.
 *
 *        Authorised builds upon `Permissioned`, so any number of address may be
 *        authorisers.  Authorisers use the permission PERM_AUTHORISER, and can
 *        be set using `setPermission()`; see `Permissioned` for more details.
 *
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or some
 *         of your token to wsl.wealdtech.eth to support continued development
 *         of these and future contracts
 */
contract Authorised is Permissioned {
    // Record of one-off hashes that have been authorised
    mapping(bytes32=>bool) private usedHashes;

    // Permissions
    bytes32 public constant PERM_AUTHORISER = keccak256("authorised: authoriser");

    /**
     * @dev A modifier that requires the sender to have the presented authorisation.
     * @param _reusable By default hashes can only be used once.  if this is true
     *                  then it can be reused
     */
    modifier ifAuthorised(bytes32 _actionHash, bytes _signature, bool _reusable) {
        require(authorise(_actionHash, _signature, _reusable));
        _;
    }
    
    /**
     * @dev Authorise an action.
     *      If a non-reusable action is authorised it is consumed.
     * @return true if the action is authorised.
     */
    function authorise(bytes32 _actionHash, bytes _signature, bool _reusable) internal returns (bool) {
        if (!_reusable) {
            if (usedHashes[_actionHash] == true) {
                // Cannot re-use
                return false;
            }
        }
        address signer = obtainSigner(_actionHash, _signature);
        if (signer == 0) {
            return false;
        }

        bool permitted = isPermitted(signer, PERM_AUTHORISER);
        if (!_reusable) {
            if (permitted) {
                usedHashes[_actionHash] = true;
            }
        }
        return permitted;
    }
    
    /**
     * @dev Check if a signature can authorise the hash of an action, without
     *      consuming the authorisation.
     */
    function checkAuthorisation(bytes32 _actionHash, bytes _signature) public view returns (bool) {
        if (usedHashes[_actionHash] == true) {
            return false;
        }
        address signer = obtainSigner(_actionHash, _signature);
        if (signer == 0) {
            return false;
        }
        return isPermitted(signer, PERM_AUTHORISER);
    }

    /**
     * @dev Obtain the signer address from a signature.
     *      Note that it is possible for the signer to be returned as 0x00
     */
    function obtainSigner(bytes32 _actionHash, bytes _signature) private pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        if (_signature.length != 65) {
            return 0;
        }

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := and(mload(add(_signature, 65)), 255)
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return 0;
        }

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _actionHash));
        return ecrecover(prefixedHash, v, r, s);
    }
}
