pragma solidity ^0.4.18;

import './IERC20.sol';
import '../auth/Permissioned.sol';

/**
 * @title BulkTransfer
 *        BulkTransfer allows multiple transfers of an ERC-20 token to different
 *        addresses with a single transaction from outside of the token contract
 *        itself.
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
contract BulkTransfer is Permissioned {
    // Permissions for this contract
    bytes32 internal constant PERM_TRANSFER = keccak256("bulk transfer: transfer");

    function bulkTransfer(IERC20 token, address[] _addresses, uint256[] _amounts) public ifPermitted(msg.sender, PERM_TRANSFER) {
        for (uint256 i = 0; i < _addresses.length; i++) {
            token.transfer(_addresses[i], _amounts[i]);
        }
    }
}
