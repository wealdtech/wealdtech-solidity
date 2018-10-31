pragma solidity ^0.4.24;

import 'erc820/contracts/ERC820Client.sol';
import 'erc820/contracts/ERC820ImplementerInterface.sol';
import './IERC777.sol';
import '../lifecycle/Managed.sol';
import '../math/SafeMath.sol';
import './SimpleTokenStore.sol';
import './ERC777TokensRecipient.sol';
import './ERC777TokensSender.sol';


/**
 * @title ERC777Token
 *        ERC777Token is an ERC-777 compliant token implementation with
 *        significantly upgraded functionality including a separate token store,
 *        bulk sends, and easy upgrading.
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
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your EIP-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract ERC777Token is IERC777, ERC820Client, ERC820ImplementerInterface, Managed {
    using SafeMath for uint256;

    // Definition for the token
    string public name;
    string public symbol;
    uint256 public granularity;
    // The store for this token's allocations
    SimpleTokenStore public store;

    // The operator information for this token
    mapping(address=>mapping(address=>bool)) private operators;

    // Permissions for this contract
    bytes32 internal constant PERM_MINT = keccak256("token: mint");
    bytes32 internal constant PERM_DISABLE_MINTING = keccak256("token: disable minting");
    bytes32 internal constant PERM_ISSUE_DIVIDEND = keccak256("token: issue dividend");
    bytes32 internal constant PERM_UPGRADE = keccak256("token: upgrade");

    // OPERATOR_ANY allows anyone to carry out an operatorSend() against an address.
    // It is used when the token control contract handles authority
    address internal constant OPERATOR_ANY = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

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
     * @param _initialSupply the initial supply of tokens
     * @param _store a pre-existing dividend token store (set to 0 if no
     *        pre-existing token store)
     */
    constructor(uint256 _version, string _name, string _symbol, uint256 _granularity, uint256 _initialSupply, address _store)
      Managed(_version)
      public
    {
        name = _name;
        symbol = _symbol;
        granularity = _granularity;

        require(_granularity > 0, "granularity must be greater than 0");
        if (_store == 0) {
            store = new SimpleTokenStore();
            if (_initialSupply > 0) {
                require(_initialSupply % _granularity == 0, "initial supply must be a multiple of granularity");

                _mint(msg.sender, msg.sender, _initialSupply, "");
            }
        } else {
            store = SimpleTokenStore(_store);
        }

        setInterfaceImplementation("ERC777Token", address(this));
    }

    function canImplementInterfaceForAddress(bytes32 interfaceHash, address addr) view public returns(bytes32) {
        // keccak256("ERC777Token") == 0xac7fbab5f54a3ca8194167523c6753bfeb96a445279294b6125b68cce2177054
        if (interfaceHash == 0xac7fbab5f54a3ca8194167523c6753bfeb96a445279294b6125b68cce2177054 && addr == address(this)) {
           // keccak256(abi.encodePacked("ERC820_ACCEPT_MAGIC") == ?
            return keccak256(abi.encodePacked("ERC820_ACCEPT_MAGIC"));
        } else {
            return 0;
        }
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
    function burn(uint256 amount, bytes data) public
        ifInState(State.Active)
    {
        _burn(msg.sender, msg.sender, amount, data, "");
    }

    /**
     * burn existing tokens.
     * @param amount the number of tokens to burn
     */
    function operatorBurn(address holder, uint256 amount, bytes data, bytes operatorData) public payable
      ifInState(State.Active)
    {
        _burn(msg.sender, holder, amount, data, operatorData);
    }

    /**
     * _burn does the work of burning tokens
     * @param operator the address of the entity invoking the burn
     * @param holder the address from which the tokens are to be burned
     * @param amount the number of tokens to be burned
     * @param data arbitrary data provided by the holder
     * @param operatorData arbitrary data provided by the operator
     */
    function _burn(address operator, address holder, uint256 amount, bytes data, bytes operatorData) internal {
        // Ensure that the amount is a multiple of granularity
        require(amount % granularity == 0, "amount must be a multiple of granularity");

        // Ensure that the operator is allowed to burn
        require(operator == holder || isOperatorFor(operator, holder), "not allowed to burn");

        // Call token control contract if present
        address senderImplementation = interfaceAddr(holder, "ERC777TokensSender");
        if (senderImplementation != 0) {
            ERC777TokensSender(senderImplementation).tokensToSend.value(msg.value)(operator, holder, 0, amount, data, operatorData);
        }

        // Transfer
        store.burn(holder, amount);

        emit Burned(operator, holder, amount, data, operatorData);
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
     * @param data arbitrary data provided by the holder
     */
    function send(address to, uint256 amount, bytes data) public
      ifInState(State.Active)
    {
        _send(msg.sender, to, amount, data, msg.sender, "");
    }

    /**
     * send multiple amounts of tokens to given addresses.
     * @param to the addresses to which to send tokens
     * @param amount the numbers of tokens to send.  Must be a multiple of granularity
     * @param data arbitrary data provided by the holder
     */
    function bulkSend(address[] to, uint256[] amount, bytes data) public
      ifInState(State.Active)
    {
        for (uint256 i = 0; i < to.length; i++) {
            send(to[i], amount[i], data);
        }
    }

    /**
     * authorize a third-party to transfer tokens on behalf of a holder.
     * @param operator the address of the third party
     */
    function authorizeOperator(address operator) public {
        require(operator != msg.sender, "not allowed to set yourself as an operator");
        operators[msg.sender][operator] = true;
        emit AuthorizedOperator(operator, msg.sender);
    }

    /**
     * revoke a third-party's authorization to transfer tokens on behalf of a
     * holder.
     * @param operator the address of the third party
     */
    function revokeOperator(address operator) public {
        // TODO do we need this require?
        require(operator != msg.sender, "not allowed to remove yourself as an operator");
        delete operators[msg.sender][operator];
        emit RevokedOperator(operator, msg.sender);
    }

    /**
     * @dev obtain if an address is an operator for a token holder, either explicitly or because
     *      everyone is authorised as an operator for the token holder
     * @param operator the address of the third party
     * @param tokenHolder the address of the holder of the tokens
     * @return true if the operator is authorized for the given token holder,
     *         otherwise false.
     */
    function isOperatorFor(address operator, address tokenHolder) public view returns (bool) {
        return operators[tokenHolder][operator] || operators[tokenHolder][OPERATOR_ANY];
    }

    /**
     * send an amount of tokens to a given address on behalf of another address.
     * @param from the address from which to send tokens
     * @param to the address to which to send tokens
     * @param amount the number of tokens to send.  Must be a multiple of granularity
     * @param data arbitrary data provided by the holder
     * @param operatorData arbitrary data provided by the operator
     */
    function operatorSend(address from, address to, uint256 amount, bytes data, bytes operatorData) public payable
      ifInState(State.Active)
    {
        _send(from, to, amount, data, msg.sender, operatorData);
    }

    /**
     * send multiple amounts of tokens to a given address on behalf of another address.
     * @param from the address from which to send tokens
     * @param to the addresses to which to send tokens
     * @param amount the numbers of tokens to send.  Must be a multiple of granularity
     * @param data arbitrary data provided by the holder
     * @param operatorData arbitrary data provided by the operator
     */
    function operatorBulkSend(address from, address[] to, uint256[] amount, bytes data, bytes operatorData) public payable
      ifInState(State.Active)
    {
        for (uint256 i = 0; i < to.length; i++) {
            operatorSend(from, to[i], amount[i], data, operatorData);
        }
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
        require(amount % granularity == 0, "amount must be a multiple of granularity");

        // Mint
        store.mint(to, amount);

        // Call token control contract if present
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == 0) {
            // The target does not implement ERC777TokensRecipient
            require(!isContract(to), "cannot mint tokens to contract that does not explicitly receive them");
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
     * @param data arbitrary data provided by the holder
     * @param operator the address of the entity invoking the transfer
     * @param operatorData arbitrary data provided by the operator
     */
    function _send(address from, address to, uint256 amount, bytes data, address operator, bytes operatorData) internal {
        // Ensure that the to address is initialised
        require(to != 0, "tokens cannot be sent to the 0 address");

        // Ensure that the amount is a multiple of granularity
        require(amount % granularity == 0, "amount must be a multiple of granularity");

        // Ensure that the operator is allowed to send
        require(operator == from || isOperatorFor(operator, from), "not allowed to send");

        // Call token control contract if present
        address senderImplementation = interfaceAddr(from, "ERC777TokensSender");
        if (senderImplementation != 0) {
            ERC777TokensSender(senderImplementation).tokensToSend.value(msg.value)(operator, from, to, amount, data, operatorData);
        }

        // Transfer
        store.transfer(from, to, amount);

        // Call token control contract if present
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == 0) {
            // The target does not implement ERC777TokensRecipient
            require(!isContract(to), "cannot send tokens to contract that does not explicitly receive them");
        } else {
            ERC777TokensRecipient(recipientImplementation).tokensReceived(operator, from, to, amount, data, operatorData);
        }

        emit Sent(operator, from, to, amount, data, operatorData);
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
