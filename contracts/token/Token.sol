pragma solidity ^0.4.11;

import './IERC20.sol';
import '../lifecycle/Managed.sol';
import '../math/SafeMath.sol';
import './DividendTokenStore.sol';


/**
 * @title Token
 *        Token is an ERC-20 compliant token implementation with significantly
 *        upgraded functionality including a separate token store, cheap bulk
 *        transfers, efficient dividends, and easy upgrading.
 *
 *        The token is fully permissioned.  Permissions to carry out operations
 *        can be given to one or more addresses.  This increases the power of
 *        the contract without increasing risk.
 *
 *        The ledger for the token is stored in a separate contract.  This is
 *        invisible to the user but provides a clean separateion of logic and
 *        storage.
 *
 *        This token follows the Wealdtech managed lifecycle, allowing for the
 *        token to be paused, redirected etc.  See `Managed` for more details.
 *
 *        It is possible to upgrade the token logic to a new contract
 *        relatively cheaply.  The functions for upgrading are built in to the
 *        contract to provide a well-defined path.
 *
 *        Transfers of tokens from a single source to multiple recipients can
 *        be carried out in a gas-efficient manner, often halving the gas cost
 *        for large bulk transfers.
 *
 *        The underlying token store supports efficient token-based dividends;
 *        see DividendTokenStore for more information about how dividends work.
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
contract Token is IERC20, Managed {
    using SafeMath for uint256;

    // The store for this token's definition, allowances and allocations
    DividendTokenStore public store;

    // The mask for the address as part of a uint256 for bulkTransfer()
    uint256 private constant ADDRESS_MASK = 0x00ffffffffffffffffffffffffffffffffffffffff;

    // Permissions for this contract
    bytes32 internal constant PERM_MINT = keccak256("token: mint");
    bytes32 internal constant PERM_ISSUE_DIVIDEND = keccak256("token: issue dividend");
    bytes32 internal constant PERM_UPGRADE = keccak256("token: upgrade");

    // This modifier syncs the data of the given account.  It *must* be
    // attached to every function that interacts with balances for *all*
    // participants in the function.
    modifier sync(address _account) {
        store.sync(_account);
        _;
    }

    /**
     * @dev Token creates the token with the required parameters.  If
     *      _tokenstore is supplied then the existing store is used, otherwise a
     *      new store is created with the other supplied parameters.
     * @param _name the name of the token (e.g. "My token")
     * @param _symbol the symbol of the token e.g. ("MYT")
     * @param _decimals the number of decimal places of the common unit (commonly 18)
     * @param _totalSupply the total supply of tokens
     * @param _store a pre-existing dividend token store (set to 0 if no pre-existing token store)
     */
    function Token(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, address _store) {
        if (_store == 0) {
            store = new DividendTokenStore(_name, _symbol, _decimals);
            if (_totalSupply > 0) {
                store.mint(msg.sender, _totalSupply);
                Transfer(0, msg.sender, store.totalSupply());
            }
        } else {
            store = DividendTokenStore(_store);
        }
    }

    /**
     * @dev Fallback
     *      This contract does not accept funds, so revert
     */
    function () public payable {
        revert();
    }

    function totalSupply() public constant ifInState(State.Active) returns (uint256) {
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
    function bulkTransfer(uint256[] data) ifInState(State.Active) {
        uint256 len = data.length;
        for (uint256 i = 0; i < len; i++) {
            transfer(address(data[i] & ADDRESS_MASK), data[i] >> 160);
        }
    }

    /**
     * @dev Carry out operations prior to upgrading to a new contract.
     *      This should give the new contract access to the token store.
     */
    function preUpgrade(address _supercededBy) public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Active) {
        // Add the new contract to the list of superusers of the token store
        store.setPermission(_supercededBy, PERM_SUPERUSER, true);
        super.preUpgrade(_supercededBy);
    }

    /**
     * @dev Carry out operations when upgrading to a new contract.
     */
    function upgrade() public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Active) {
        super.upgrade();
    }

    /**
     * @dev Commit the upgrade.  No going back from here
     */
    function commitUpgrade() ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Upgraded) {
        // Remove ourself from the list of superusers of the token store
        store.setPermission(this, PERM_SUPERUSER, false);
        super.commitUpgrade();
    }

    /**
     * @dev revert the upgrade.  Will only work prior to committing
     */
    function revertUpgrade() public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Upgraded) {
        // Remove the contract from the list of superusers of the token store.
        // Note that if this is called after commitUpgrade() then it will fail
        // as we will no longer have permission to do this.
        if (supercededBy != 0) {
            store.setPermission(supercededBy, PERM_SUPERUSER, false);
        }
        super.revertUpgrade();
    }

    /**
     * @dev issue a dividend.
     *      Provide a number of tokens as a dividend.  The tokens will be
     *      allocated to all existing token holders (including the sender) in
     *      proportion to the number of tokens they hold at the time this
     *      function is called.
     * @param _amount the amount of the dividend to issue
     */
    function issueDividend(uint256 _amount) sync(msg.sender) ifPermitted(msg.sender, PERM_ISSUE_DIVIDEND) ifInState(State.Active) {
        store.issueDividend(msg.sender, _amount);
    }

    /**
     * @dev mint more tokens
     * @param _amount the amount of tokens to mint
     */
    function mint(uint256 _amount) sync(msg.sender) ifPermitted(msg.sender, PERM_MINT) ifInState(State.Active) {
        store.mint(msg.sender, _amount);
        Transfer(0, msg.sender, _amount);
    }

    //
    // Standard ERC-20 functions
    //

    function transfer(address _recipient, uint256 _value) sync(msg.sender) sync(_recipient) ifInState(State.Active) returns (bool) {
        require(_recipient != address(this));
        store.transfer(msg.sender, _recipient, _value);
        Transfer(msg.sender, _recipient, _value);
        return true;
    }

    function balanceOf(address _owner) public constant ifInState(State.Active) returns (uint256) {
        return store.balanceOf(_owner);
    }

    function allowance(address _owner, address _recipient) public constant ifInState(State.Active) returns (uint256) {
        return store.allowanceOf(_owner, _recipient);
    }

    function transferFrom(address _owner, address _recipient, uint256 _value) sync(msg.sender) sync(_owner) sync(_recipient) ifInState(State.Active) returns (bool) {
        store.useAllowance(_owner, msg.sender, _recipient, _value);
        Transfer(_owner, _recipient, _value);
        return true;
    }

    function approve(address _recipient, uint256 _value) sync(msg.sender) sync(_recipient) ifInState(State.Active) returns (bool) {
        require(_recipient != address(this));
        store.setAllowance(msg.sender, _recipient, _value);
        Approval(msg.sender, _recipient, _value);
        return true;
    }
}
