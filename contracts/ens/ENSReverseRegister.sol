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

// Important parts of the ENS registry contract
contract RegistryRef {
    function owner(bytes32 node) public constant returns (address);
}


// Important parts of the ENS reverse registrar contract
contract ReverseRegistrarRef {
    function setName(string name) public returns (bytes32 node);
}


/**
 * @title ENSReverseRegister
 *        ENS resolves names to addresses, and addresses to names.  But to set
 *        the resolution from address to name the transaction must come from
 *        the address in question.  This contract sets the reverse resolution as
 *        part of the contract initialisation.
 *
 *        To use this your code should inherit this contract and provide the
 *        appropriate arguments in its constructor, for example:
 *
 *            contract MyContract is ENSReverseRegister {
 *                ...
 *                MyContract(address ens) ENSReverseRegister(ens, "mycontract.eth") {
 *                    ...
 *                }
 *            }
 *
 *        Note that for this to work your contract must be given the address of
 *        the ENS registry.  If this is not supplied then this code will not run
 *        and the reverse entry will not be set in ENS (but it will not throw).
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
contract ENSReverseRegister {
    /**
     * @dev initialise the contract with the address of the reverse registrar
     */
    constructor(address registry, string name) public {
        if (registry != 0) {
            // Fetch the address of the ENS reverse registrar
            // Hex value is namehash('addr.reverse')
            address reverseRegistrar = RegistryRef(registry).owner(0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2);
            // If it exists then set our reverse resolution
            if (reverseRegistrar != 0) {
                ReverseRegistrarRef(reverseRegistrar).setName(name);
            }
        }
    }
}
