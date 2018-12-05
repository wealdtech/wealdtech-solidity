pragma solidity ^0.5.0;

import '../token/IERC777.sol';


/**
 * @title BulkSend
 *
 *        An ERC777 token operator contract that provides a number of bulk send
 *        functions
 *        
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract BulkSend {
    /**
     * Send a given amount of tokens to multiple recipients
     * @param _token the address of the token contract
     * @param _recipients the list of recipents
     * @param _amount the amount of tokens to send to each recipient
     * @param _data the data to attach to each send
     */
    function send(IERC777 _token, address[] memory _recipients, uint256 _amount, bytes memory _data) public {
        for (uint256 i = 0; i < _recipients.length; i++) {
            _token.operatorSend(msg.sender, _recipients[i], _amount, _data, "");
        }
    }

    /**
     * Send individual amounts of tokens to multiple recipients
     * @param _token the address of the token contract
     * @param _recipients the list of recipents
     * @param _amounts the amount of tokens to send to each recipient
     * @param _data the data to attach to each send
     */
    function sendAmounts(IERC777 _token, address[] memory _recipients, uint256[] memory _amounts, bytes memory _data) public {
        for (uint256 i = 0; i < _recipients.length; i++) {
            _token.operatorSend(msg.sender, _recipients[i], _amounts[i], _data, "");
        }
    }
}
