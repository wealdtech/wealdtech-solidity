pragma solidity ^0.5.0;

import '../token/IERC777.sol';


/**
 * @title VaultRecipient
 *
 *        An ERC777 token operator contract that allows tokens to be sent to a
 *        pre-defined address if requested by said address.
 *
 *        There is a common tradeoff between ease of use and security with
 *        private keys.  The purpose of this operator is to act as a bridge
 *        between the two, providing a way for the holder of the high-security
 *        private key (e.g. on a hardware wallet) to pull tokens to their
 *        account without the private key of the holder.  This way, if the
 *        lower-security key is inaccessible (e.g. a lost 'phone containing the
 *        key) the funds can be retrieved.
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
contract VaultRecipient {
    // Mapping is token=>holder=>vault
    mapping(address=>mapping(address=>address)) private vaults;

    event Vault(address token, address holder, address vault);

    /**
     * Set a vault address.  The vault address has blanket authority to transfer
     * tokens from the holder's account.
     * @param _token the address of the token contract
     * @param _vault the address of the vault
     */
    function setVault(IERC777 _token, address _vault) public {
        vaults[address(_token)][msg.sender] = _vault;
        emit Vault(address(_token), msg.sender, _vault);
    }

    function getVault(IERC777 _token, address _holder) public view returns (address) {
        return vaults[address(_token)][_holder];
    }

    /**
     * Send a given amount of tokens to the vault
     * @param _token the address of the token contract
     * @param _amount the amount of tokens to send to the vault
     * @param _data the data to attach to the send
     */
    function send(IERC777 _token, address _holder, uint256 _amount, bytes memory _data) public {
        preSend(_token, _holder);
        _token.operatorSend(_holder, msg.sender, _amount, _data, "");
    }

    function preSend(IERC777 _token, address _holder) internal view {
        address vault = vaults[address(_token)][_holder];
        require(vault != address(0), "vault not configured");
        require(vault == msg.sender, "not the vault account");
    }
}
