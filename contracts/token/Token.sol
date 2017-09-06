pragma solidity ^0.4.11;

import '../../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';

import '../lifecycle/Pausable.sol';
import '../lifecycle/Redirectable.sol';
import './IPermissionedTokenStore.sol';
import './SimpleTokenStore.sol';
import './IERC20.sol';


/**
 * @title Token
 *        Token is an ERC-20 compliant token implementation with significantly
 *        upgraded functionality including a separate token store, cheap bulk
 *        transfers and easy upgrading.
 *
 *        The token is fully permissioned.  Permissions to carry out operations
 *        can be given to one or more addresses.  This increases the flexibility
 *        of the contract without increasing risk
 *
 *        Operations on the contract can be halted if required.
 *
 *        The ledger for the token is stored in a separate contract.  This is
 *        invisible to the user but provides a clean separateion of logic and
 *        storage.
 *
 *        Upgradeable.  It is possible to upgrade the token logic to a new
 *        contract relatively cheaply.  The functions for upgrading are built
 *        in to the contract to provide a well-defined path.
 *
 *        Redirectable.  If this contract is retired as part of an upgrade it
 *        can supply the address of the upgraded contract on request.
 *
 *        Transfers of tokens from a single source to multiple recipients can
 *        be carried out in a gas-efficient manner, often halving the gas cost
 *        for large bulk transfers.
 *
 *          - direct.  The contract contains a list of contracts that can take
 *            funds directly from holders (use with care)
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Token is IERC20, Pausable, Redirectable {
    using SafeMath for uint256;

    // The store for this token's definition, allowances and allocations
    IPermissionedTokenStore public store;

    // The mask for the address as part of a uint256 for bulkTransfer()
    uint256 private constant ADDRESS_MASK = 0x00ffffffffffffffffffffffffffffffffffffffff;

    // Permissions for this contract
    bytes32 internal constant PERM_UPGRADE = keccak256("token: upgrade");
    // Also inherit PERM_PAUSE
    // Also inherit PERM_REDIRECT

    event Transfer(address indexed _from, address indexed _to, uint256 value);

    /**
     * @dev Token creates the token with the required parameters.  If _store is supplied
     *      then the existing store is used, otherwise a new store is created with the
     *      other supplied parameters
     * @param _name the name of the token (e.g. "My token")
     * @param _symbol the symbol of the token e.g. ("MYT")
     * @param _decimals the number of decimal places of the common unit (commonly 0 or 18)
     * @param _totalSupply the total supply (in the common unit)
     * @param _store a pre-existing token store (set to 0 if no pre-existing token store)
     */
    function Token(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, address _store) {
        if (_store == 0) {
            store = new SimpleTokenStore(_name, _symbol, _decimals);
            store.mint(msg.sender, _totalSupply * uint256(10) ** _decimals);
        } else {
            store = IPermissionedTokenStore(_store);
        }
    }

    /**
     * @dev Fallback
     *      This contract does not accept funds, so revert
     */
    function () public payable {
        revert();
    }

    function totalSupply() public constant returns (uint256) {
        return store.totalSupply();
    }

    //
    // Advanced functions
    //

    /**
     * @dev bulkTransfer() allows multiple transfers to be made from the sender
     *      in a single transaction.  This is more gas-efficient than multiple
     *      calls to transfer().
     *      Bulk transfer takes an array of uint256s.  Each uint256 is a packed
     *      value containing both the address to which to transfer the funds
     *      and the funds hemselves, with the address to which to transfer the
     *      funds placed in the lowest 20 bytes and the value of the funds to
     *      transfer placed in * the highest 12 bytes. For example, to send
     *      1000000 tokens to address 0x12345678901223456789012345678901234567890
     *      the uint256 would be:
     *
     *         |---------12-----------||-------------------20------------------|
     *         |--------VALUE---------||----------------ADDRESS----------------|
     *       0x0000000000000000000F424012345678901223456789012345678901234567890
     *
     *       Note that due to the packing the range of the value is restricted;
     *       very large transfers may not be able to be sent with this method.
     */
    function bulkTransfer(uint256[] data) {
        uint256 len = data.length;
        for (uint256 i = 0; i < len; i++) {
            transfer(address(data[i] & ADDRESS_MASK), data[i] >> 160);
        }
    }

    address private upgradeAddress;

    /**
     * @dev Carry out operations prior to upgrading to a new contract.
     *      This should give the new contract access to the token store.
     */
    function preUpgrade(address _upgradeAddress) public ifPermitted(msg.sender, PERM_UPGRADE) {
        // Add the new contract to the list of superusers of the token store
        store.setPermission(_upgradeAddress, PERM_SUPERUSER, true);
        // Retain the contract address for later
        upgradeAddress = _upgradeAddress;
    }

    /**
     * @dev Carry out operations when upgrading to a new contract.
     */
    function upgrade() public ifPermitted(msg.sender, PERM_UPGRADE) {
        require(upgradeAddress != 0);
        if (!paused) {
            pause();
        }
        setRedirect(upgradeAddress);
        upgradeAddress = 0;
    }

    /**
     * @dev Carry out operations after upgrading to a new contract.
     *      This should shut this contract down permanently.
     */
    function postUpgrade() ifPermitted(msg.sender, PERM_UPGRADE) {
        // Remove ourself from the list of superusers of the token store
        store.setPermission(this, PERM_SUPERUSER, false);
    }

    function cancelUpgrade() public ifPermitted(msg.sender, PERM_UPGRADE) {
        // Remove the contract from the list of superusers of the token store.
        // Note that if this is called after postUpgrade() then it will fail
        // as we will no longer have permission to do this.
        store.setPermission(upgradeAddress, PERM_SUPERUSER, false);
        upgradeAddress = 0;

        // Unpause ourself if we were paused
        if (paused) {
            unpause();
        }
    }

    //
    // Standard ERC-20 functions
    //

    function transfer(address _to, uint256 _value) returns (bool) {
        store.transfer(msg.sender, _to, _value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function balanceOf(address _owner) constant returns (uint256) {
        return store.balanceOf(_owner);
    }

    function allowance(address _owner, address _recipient) constant returns (uint256) {
        return store.allowanceOf(_owner, _recipient);
    }

    function transferFrom(address _owner, address _recipient, uint256 _value) returns (bool) {
        store.useAllowance(_owner, msg.sender, _recipient, _value);
        Transfer(_owner, _recipient, _value);
        return true;
    }

    function approve(address _recipient, uint256 _value) returns (bool) {
        store.setAllowance(msg.sender, _recipient, _value);
        Approval(msg.sender, _recipient, _value);
        return true;
    }
}
