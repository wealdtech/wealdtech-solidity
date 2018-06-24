pragma solidity ^0.4.18;

import 'eip820/contracts/ERC820Implementer.sol';
import './IERC777.sol';
import '../lifecycle/Managed.sol';
import '../math/SafeMath.sol';
import './DividendTokenStore.sol';
import './ERC777TokensRecipient.sol';
import './ERC777TokensSender.sol';


/**
 * @title ERC777Token
 *        ERC777Token is an ERC-777 compliant token implementation with
 *        significantly upgraded functionality including a separate token store,
 *        cheap bulk transfers, efficient dividends, and easy upgrading.
 *
 *        ERC777 tokens have the same base divisibility, with every token
 *        broken in to 10^18 divisions.  That is, every token can be subdivided
 *        to 18 decimal places.  If a developer prefers a token to have a
 *        coarser they can do so by setting the granularity of the token; to
 *        only have n decimal places they would set granularity to 10^(18-n).
 *
 *        The token is fully permissioned.  Permissions to carry out operations
 *        can be given to one or more addresses.  This increases the power of
 *        the contract without increasing risk.
 *
 *        The ledger for the token is stored in a separate contract.  This is
 *        invisible to the user but provides a clean separation of logic and
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
 *         some of your EIP-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract ERC777Token is IERC777, ERC820Implementer, Managed {
    using SafeMath for uint256;

    // Definition for the token
    string public name;
    string public symbol;
    uint256 public granularity;
    // The store for this token's allocations
    DividendTokenStore public store;

    // The operator information for this token
    mapping(address=>mapping(address=>bool)) private operators;
    // TODO
    mapping(address=>address[]) private operatorsList;

    // The mask for the address as part of a uint256 for bulkTransfer()
    uint256 private constant ADDRESS_MASK = 0x00ffffffffffffffffffffffffffffffffffffffff;

    // Permissions for this contract
    bytes32 internal constant PERM_MINT = keccak256("token: mint");
    bytes32 internal constant PERM_DISABLE_MINTING = keccak256("token: disable minting");
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
     * Constructor creates the token with the required parameters.  If
     * _tokenstore is supplied then the existing store is used, otherwise a new
     * store created with the other supplied parameters.
     * @param _version the version of this contract (e.g. 1)
     * @param _name the name of the token (e.g. "My token")
     * @param _symbol the symbol of the token e.g. ("MYT")
     * @param _granularity the smallest indivisible unit of the tokens.  Any
     *        attempts to operate with amounts that are not multiples of
     *        granularity will fail
     * @param _totalSupply the total supply of tokens
     * @param _store a pre-existing dividend token store (set to 0 if no
     *        pre-existing token store)
     */
    constructor(uint256 _version, string _name, string _symbol, uint256 _granularity, uint256 _totalSupply, address _store)
      Managed(_version)
      public
    {
        name = _name;
        symbol = _symbol;
        granularity = _granularity;

        require(_granularity > 0);
        if (_store == 0) {
            store = new DividendTokenStore();
            if (_totalSupply > 0) {
                // Total supply should be at least 1 token
                require(_totalSupply > 10**18);

                // Sanity checks
                require(_totalSupply % _granularity == 0);

                _mint(msg.sender, msg.sender, _totalSupply, "");
            }
        } else {
            store = DividendTokenStore(_store);
        }

        setInterfaceImplementation("erc777-Token", this);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) pure public returns(bytes32) {
        // TODO
        (addr, interfaceHash);
        return keccak256("ERC820_ACCEPT_MAGIC");
    }

    /**
     * This contract does not accept funds, so revert.
     */
    function () public payable {
        revert();
    }

    /**
     * mint more tokens.
     * @param to the address to which the tokens are to be minted
     * @param amount the number of tokens to mint
     * @param operatorData arbitrary data provided by the operator
     * @notice requires the PERM_MINT permission
     */
    function mint(address to, uint256 amount, bytes operatorData) public
        sync(to)
        ifPermitted(msg.sender, PERM_MINT)
        ifInState(State.Active)
    {
        _mint(msg.sender, to, amount, operatorData);
    }

    /**
     * disable futher minting of tokens.
     * @notice requires the PERM_DISABLE_MINTING permission
     */
    function disableMinting() public
      ifPermitted(msg.sender, PERM_DISABLE_MINTING)
    {
        store.disableMinting();
    }

    /**
     * burn existing tokens.
     * @param amount the number of tokens to burn
     */
    function burn(uint256 amount, bytes userData) public
        sync(msg.sender)
        ifInState(State.Active)
    {
        _burn(msg.sender, msg.sender, amount, userData, "");
    }

    /**
     * burn existing tokens.
     * @param amount the number of tokens to burn
     */
    function operatorBurn(address holder, uint256 amount, bytes userData, bytes operatorData) public
      sync(holder)
      ifInState(State.Active)
    {
        _burn(msg.sender, holder, amount, userData, operatorData);
    }

    /**
     * _burn does the work of burning tokens
     * @param operator the address of the entity invoking the burn
     * @param holder the address from which the tokens are to be burned
     * @param amount the number of tokens to be burned
     * @param userData arbitrary data provided by the holder
     * @param operatorData arbitrary data provided by the operator
     */
    function _burn(address operator, address holder, uint256 amount, bytes userData, bytes operatorData) internal {
        // Ensure that the amount is a multiple of granularity
        require (amount % granularity == 0);

        // Ensure that the operator is allowed to burn
        require(operator == holder || operators[holder][operator]);

        // Call remote sender if present
        address senderImplementation = interfaceAddr(holder, "ERC777TokensSender");
        if (senderImplementation != 0) {
            ERC777TokensSender(senderImplementation).tokensToSend(operator, holder, 0, amount, userData, operatorData);
        }

        // Transfer
        store.burn(holder, amount);

        emit Burned(operator, holder, amount, userData, operatorData);
    }

    //
    // Standard EIP-777 functions
    //

    /**
     * obtain the name of this token.
     * @return name of this token.
     */
    function name() public constant ifInState(State.Active) returns (string) {
        return name;
    }

    /**
     * obtain the symbol of this token.
     * @return symbol of this token.
     */
    function symbol() public constant ifInState(State.Active) returns (string) {
        return symbol;
    }

    /**
     * obtain the granularity of this token.  All token amounts for minting,
     * burning and transfers must be an integer multiple of this amount.
     * @return granularity of this token.
     */
    function granularity() public constant ifInState(State.Active) returns (uint256) {
        return granularity;
    }

    /**
     * obtain the total supply of this token.
     * @return total supply of this token.
     */
    function totalSupply() public constant ifInState(State.Active) returns (uint256) {
        return store.totalSupply();
    }

    /**
     * obtain the balance of a particular holder for this token.
     * @param tokenHolder the address of the holder of the tokens
     * @return balance of thie given holder
     */
    function balanceOf(address tokenHolder) public constant ifInState(State.Active) returns (uint256) {
        return store.balanceOf(tokenHolder);
    }

    /**
     * send an amount of tokens to a given address.
     * @param to the address to which to send tokens
     * @param amount the number of tokens to send.  Must be a multiple of granularity
     * @param userData arbitrary data provided by the sender
     */
    function send(address to, uint256 amount, bytes userData) public
      sync(msg.sender)
      sync(to)
      ifInState(State.Active)
    {
        _send(msg.sender, to, amount, userData, msg.sender, "");
    }

    /**
     * authorize a third-party to transfer tokens on behalf of a holder.
     * @param operator the address of the third party
     */
    function authorizeOperator(address operator) public {
        require(operator != msg.sender);
        operators[msg.sender][operator] = true;
        emit AuthorizedOperator(operator, msg.sender);
    }

    /**
     * revoke a third-party's authorization to transfer tokens on behalf of a
     * holder.
     * @param operator the address of the third party
     */
    function revokeOperator(address operator) public {
        require(operator != msg.sender);
        delete operators[msg.sender][operator];
        emit RevokedOperator(operator, msg.sender);
    }

    /**
     * @dev obtain if an address is an operator for a token holder
     * @param operator the address of the third party
     * @param tokenHolder the address of the holder of the tokens
     * @return true if the operator is authorized for the given token holder,
     *         otherwise false.
     */
    function isOperatorFor(address operator, address tokenHolder) public view returns (bool) {
        return operators[tokenHolder][operator];
    }

    /**
     * carry out a third-party transfer of tokens
     * @param from the address from which to send tokens
     * @param to the address to which to send tokens
     * @param amount the number of tokens to send.  Must be a multiple of granularity
     * @param userData arbitrary data provided by the sender
     * @param operatorData arbitrary data provided by the operator
     */
    function operatorSend(address from, address to, uint256 amount, bytes userData, bytes operatorData) public
      sync(from)
      sync(to)
      ifInState(State.Active)
    {
        _send(from, to, amount, userData, msg.sender, operatorData);
    }

    //
    // Internal functions
    //

    /**
     * _mint does the work of minting tokens
     * @param operator the address of the entity minting the tokens
     * @param to the address to which the tokens are to be minted
     * @param amount the number of tokens to be transferred
     * @param operatorData arbitrary data provided by the operator
     */
    function _mint(address operator, address to, uint256 amount, bytes operatorData) internal {
        // Ensure that the amount is a multiple of granularity
        require (amount % granularity == 0);

        // Mint
        store.mint(to, amount);

        // Call remote recipient
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == 0) {
            // The target does not implement ERC777TokensRecipient
            if (isContract(to)) {
                // The target is a contract; do not send tokens to this address
                revert();
            }
        } else {
            ERC777TokensRecipient(recipientImplementation).tokensReceived(operator, address(0), to, amount, "", operatorData);
        }

        emit Minted(operator, to, amount, operatorData);
    }

    /**
     * _send does the work of transferring tokens
     * @param from the address from which the tokens are to be transferred
     * @param to the address to which the tokens are to be transferred
     * @param amount the number of tokens to be transferred
     * @param userData arbitrary data provided by the sender
     * @param operator the address of the entity invoking the transfer
     * @param operatorData arbitrary data provided by the operator
     */
    function _send(address from, address to, uint256 amount, bytes userData, address operator, bytes operatorData) internal {
        // Ensure that the to address is initialised
        require(to != 0);

        // Ensure that the amount is a multiple of granularity
        require(amount % granularity == 0);

        // Ensure that the operator is allowed to send
        require(operator == from || operators[from][operator]);

        // Call remote sender if present
        address senderImplementation = interfaceAddr(from, "ERC777TokensSender");
        if (senderImplementation != 0) {
            ERC777TokensSender(senderImplementation).tokensToSend(operator, from, to, amount, userData, operatorData);
        }

        // Transfer
        store.transfer(from, to, amount);

        // Call remote recipient
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == 0) {
            // The target does not implement ERC777TokensRecipient
            if (isContract(to)) {
                // The target is a contract; do not send tokens to this address
                revert();
            }
        } else {
            ERC777TokensRecipient(recipientImplementation).tokensReceived(operator, from, to, amount, userData, operatorData);
        }

        emit Sent(operator, from, to, amount, userData, operatorData);
    }

    /**
     * Check if an address is a contract
     */
    function isContract(address _addr) internal constant returns(bool) {
        if (_addr == 0) {
            return false;
        }
        uint size;
        assembly {
            size := extcodesize(_addr) 
        }
        return size != 0;
    }

    //
    // Upgrade flow
    //

    /**
     * carry out operations prior to upgrading to a new contract.  This should
     * give the new contract access to the token store.
     * @notice requires the PERM_UPGRADE permission
     */
    function preUpgrade(address _supercededBy) public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Active) {
        // Add the new contract to the list of superusers of the token store
        store.setPermission(_supercededBy, PERM_SUPERUSER, true);
        super.preUpgrade(_supercededBy);
    }

    /**
     * carry out operations when upgrading to a new contract.
     * @notice requires the PERM_UPGRADE permission
     */
    function upgrade() public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Active) {
        super.upgrade();
    }

    /**
     * commit the upgrade.  No going back from here.
     * @notice requires the PERM_UPGRADE permission
     */
    function commitUpgrade() public ifPermitted(msg.sender, PERM_UPGRADE) ifInState(State.Upgraded) {
        // Remove ourself from the list of superusers of the token store
        store.setPermission(this, PERM_SUPERUSER, false);
        super.commitUpgrade();
    }

    /**
     * revert the upgrade.  Will only work prior to committing.
     * @notice requires the PERM_UPGRADE permission
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
}
