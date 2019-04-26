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


/**
 * @title ERC777TokensSender
 *        ERC777TokensSender is the interface for contracts that handle pre-send
 *        of tokens from ERC777 token contracts
 *
 * @author Jim McDonald
 */
interface ERC777TokensSender {

    /**
      * Function to act prior to send of tokens for a given contract.
      *
      * @param operator is the address that carried out the transfer
      * @param from is the address from which the tokens will be transferred
      * @param to is the address to which the tokens will be transferred
      * @param amount is the amount of tokens that will be transferred
      * @param data is data supplied by the user for the transfer
      * @param operatorData is data supplied by the operator for the transfer
      */
    function tokensToSend(address operator, address from, address to, uint256 amount, bytes calldata data, bytes calldata operatorData) external;
}
