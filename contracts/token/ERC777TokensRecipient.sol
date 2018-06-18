pragma solidity ^0.4.18;

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


/**
 * @title ERC777TokensRecipient
 *        ERC777TokensRecipient is the interface for contracts that handle
 *        receipt of tokens from ERC777 token contracts
 */
interface ERC777TokensRecipient {

    /**
      * Function to act on receipt of tokens for a given contract.
      *
      * @param operator is the address that carried out the transfer
      * @param from is the address from which the tokens have been transferred
      * @param to is the address to which the tokens have been transferred
      * @param value is the value of tokens transferred
      * @param userData is data supplied by the user for the transfer
      * @param operatorData is data supplied by the operator for the transfer
      */
    function tokensReceived(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public;
}
