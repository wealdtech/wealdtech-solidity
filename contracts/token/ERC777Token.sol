pragma solidity ^0.5.0;

import 'erc820/contracts/ERC820Client.sol';
import './IERC777.sol';
import '../lifecycle/Managed.sol';
import '../math/SafeMath.sol';
import '../registry/ERC820Implementer.sol';
import './SimpleTokenStore.sol';
import './ERC777TokensRecipient.sol';
import './ERC777TokensSender.sol';


/**
 * @title ERC777Token
 *        ERC777Token is an ERC-777 compliant token implementation with a
 *        separate token store and easy upgrading.
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
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 */
contract ERC777Token is IERC777, ERC820Client, ERC820Implementer, Managed {
    using SafeMath for uint256;

    // Definition for the token
    string private __name;
    string private __symbol;
    uint256 private __granularity;
    // The store for this token's allocations
    SimpleTokenStore public store;

    //
    // Operators
    //

    // The per-holder operator information for this token, configured by each holder
    // holder=>operator=>allowed
    mapping(address=>mapping(address=>bool)) private operators;

    // Default operators, configured by the token contract creator
    address[] public defaultOperators;
    // Map version of default operators, to ease checking
    mapping(address=>bool) private defaultOperatorsMap;
    // Revoked default operators, configured by each holder
    // holder=>operator=>disallowed
    mapping(address=>mapping(address=>bool)) private revokedDefaultOperators;

    // Permissions for this contract
    bytes32 internal constant PERM_MINT = keccak256("token: mint");
    bytes32 internal constant PERM_DISABLE_MINTING = keccak256("token: disable minting");
    bytes32 internal constant PERM_UPGRADE = keccak256("token: upgrade");

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
     * @param _defaultOperators list of addresses of operators for the token
     * @param _store a pre-existing dividend token store (set to 0 if no
     *        pre-existing token store)
     */
    constructor(uint256 _version,
                string memory _name,
                string memory _symbol,
                uint256 _granularity,
                uint256 _initialSupply,
                address[] memory _defaultOperators,
                address _store)
      Managed(_version)
      public
    {
        __name = _name;
        __symbol = _symbol;
        __granularity = _granularity;

        require(_granularity > 0, "granularity must be greater than 0");
        if (_store == address(0)) {
            store = new SimpleTokenStore();
            if (_initialSupply > 0) {
                require(_initialSupply % _granularity == 0, "initial supply must be a multiple of granularity");

                _mint(msg.sender, msg.sender, _initialSupply, "");
            }
        } else {
            store = SimpleTokenStore(_store);
        }

        // Store default operators as both list and map
        defaultOperators = _defaultOperators;
        for (uint256 i = 0; i < defaultOperators.length; i++) {
            defaultOperatorsMap[defaultOperators[i]] = true;
        }

        implementInterface("ERC777Token");
    }

    /**
     * This contract does not accept funds, so revert.
     */
    function () external {
        revert();
    }

    /**
     * mint more tokens.
     * @param _to the address to which the tokens are to be minted
     * @param _amount the number of tokens to mint
     * @param _operatorData arbitrary data provided by the operator
     * @notice requires the PERM_MINT permission
     */
    function mint(address _to, uint256 _amount, bytes memory _operatorData) public
        ifPermitted(msg.sender, PERM_MINT)
        ifInState(State.Active)
    {
        _mint(msg.sender, _to, _amount, _operatorData);
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
     * @param _amount the number of tokens to burn
     */
    function burn(uint256 _amount, bytes memory _data) public
        ifInState(State.Active)
    {
        _burn(msg.sender, msg.sender, _amount, _data, "");
    }

    /**
     * burn existing tokens as an operator.
     * @param _holder the address from which the tokens are to be burned
     * @param _amount the number of tokens to burn
     * @param _data arbitrary data provided by the holder
     * @param _operatorData arbitrary data provided by the operator
     */
    function operatorBurn(address _holder, uint256 _amount, bytes memory _data, bytes memory _operatorData) public
      ifInState(State.Active)
    {
        _burn(msg.sender, _holder, _amount, _data, _operatorData);
    }

    /**
     * _burn does the work of burning tokens
     * @param operator the address of the entity invoking the burn
     * @param holder the address from which the tokens are to be burned
     * @param amount the number of tokens to be burned
     * @param data arbitrary data provided by the holder
     * @param operatorData arbitrary data provided by the operator
     */
    function _burn(address operator, address holder, uint256 amount, bytes memory data, bytes memory operatorData) internal {
        // Ensure that the amount is a multiple of granularity
        require(amount % __granularity == 0, "amount must be a multiple of granularity");

        // Ensure that there are enough tokens to burn
        require(amount <= store.balanceOf(holder), "not enough tokens in holder's account");

        // Ensure that the operator is allowed to burn
        require(operator == holder || isOperatorFor(operator, holder), "not allowed to burn");

        // Call token control contract if present
        address senderImplementation = interfaceAddr(holder, "ERC777TokensSender");
        if (senderImplementation != address(0)) {
            ERC777TokensSender(senderImplementation).tokensToSend(operator, holder, address(0), amount, data, operatorData);
        }

        // Transfer
        store.burn(holder, amount);

        emit Burned(operator, holder, amount, data, operatorData);
    }

    //
    // Standard ERC-777 functions
    //

    /**
     * obtain the name of this token.
     * @return name of this token.
     */
    function name() public view ifInState(State.Active) returns (string memory) {
        return __name;
    }

    /**
     * obtain the symbol of this token.
     * @return symbol of this token.
     */
    function symbol() public view ifInState(State.Active) returns (string memory) {
        return __symbol;
    }

    /**
     * obtain the granularity of this token.  All token amounts for minting,
     * burning and transfers must be an integer multiple of this amount.
     * @return granularity of this token.
     */
    function granularity() public view ifInState(State.Active) returns (uint256) {
        return __granularity;
    }

    /**
     * obtain the total supply of this token.
     * @return total supply of this token.
     */
    function totalSupply() public view ifInState(State.Active) returns (uint256) {
        return store.totalSupply();
    }

    /**
     * obtain the balance of a particular holder for this token.
     * @param _tokenHolder the address of the holder of the tokens
     * @return balance of thie given holder
     */
    function balanceOf(address _tokenHolder) public view ifInState(State.Active) returns (uint256) {
        return store.balanceOf(_tokenHolder);
    }

    /**
     * send an amount of tokens to a given address.
     * @param _to the address to which to send tokens
     * @param _amount the number of tokens to send.  Must be a multiple of granularity
     * @param _data arbitrary data provided by the holder
     */
    function send(address _to, uint256 _amount, bytes memory _data) public
      ifInState(State.Active)
    {
        _send(msg.sender, _to, _amount, _data, msg.sender, "");
    }

    /**
     * @dev authorize a third-party to transfer tokens on behalf of a token
     *      holder.
     * @param _operator the address of the third party
     */
    function authorizeOperator(address _operator) public {
        require(_operator != msg.sender, "not allowed to set yourself as an operator");
        if (defaultOperatorsMap[_operator]) {
            revokedDefaultOperators[msg.sender][_operator] = false;
        } else {
            operators[msg.sender][_operator] = true;
        }

        emit AuthorizedOperator(_operator, msg.sender);
    }

    /**
     * @dev revoke a third-party's authorization to transfer tokens on behalf of
     *      of a token holder.
     * @param _operator the address of the operator
     */
    function revokeOperator(address _operator) public {
        require(_operator != msg.sender, "not allowed to remove yourself as an operator");
        if (defaultOperatorsMap[_operator]) {
            revokedDefaultOperators[msg.sender][_operator] = true;
        } else {
            delete operators[msg.sender][_operator];
        }
        emit RevokedOperator(_operator, msg.sender);
    }

    /**
     * @dev obtain if an address is an operator for a token holder.  An address
     *      could be an operator if it is explicitly enabled by the token
     *      holder, or a default for the token and not explicitly disabled by
     *      the token holder.
     * @param _operator the address of the operator
     * @param _tokenHolder the address of the holder of the tokens
     * @return true if the operator is authorized for the given token holder,
     *         otherwise false.
     */
    function isOperatorFor(address _operator, address _tokenHolder) public view returns (bool) {
        return (operators[_tokenHolder][_operator] || (defaultOperatorsMap[_operator] && !revokedDefaultOperators[_tokenHolder][_operator]));
    }

    /**
     * send an amount of tokens to a given address on behalf of another address.
     * @param _from the address from which to send tokens
     * @param _to the address to which to send tokens
     * @param _amount the number of tokens to send.  Must be a multiple of granularity
     * @param _data arbitrary data provided by the holder
     * @param _operatorData arbitrary data provided by the operator
     */
    function operatorSend(address _from, address _to, uint256 _amount, bytes memory _data, bytes memory _operatorData) public
      ifInState(State.Active)
    {
        _send(_from, _to, _amount, _data, msg.sender, _operatorData);
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
    function _mint(address operator, address to, uint256 amount, bytes memory operatorData) internal {
        // Ensure that the amount is a multiple of granularity
        require(amount % __granularity == 0, "amount must be a multiple of granularity");

        // Mint
        store.mint(to, amount);

        // Call token control contract if present
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == address(0)) {
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
    function _send(address from, address to, uint256 amount, bytes memory data, address operator, bytes memory operatorData) internal {
        // Ensure that the to address is initialised
        require(to != address(0), "tokens cannot be sent to the 0 address");

        // Ensure that the amount is a multiple of granularity
        require(amount % __granularity == 0, "amount must be a multiple of granularity");

        // Ensure that there are enough tokens to send
        require(amount <= store.balanceOf(from), "not enough tokens in holder's account");

        // Ensure that the operator is allowed to send
        require(operator == from || isOperatorFor(operator, from), "not allowed to send");

        // Call token control contract if present
        address senderImplementation = interfaceAddr(from, "ERC777TokensSender");
        if (senderImplementation != address(0)) {
            ERC777TokensSender(senderImplementation).tokensToSend(operator, from, to, amount, data, operatorData);
        }

        // Transfer
        store.transfer(from, to, amount);

        // Call token control contract if present
        address recipientImplementation = interfaceAddr(to, "ERC777TokensRecipient");
        if (recipientImplementation == address(0)) {
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
    function isContract(address _addr) internal view returns(bool) {
        if (_addr == address(0)) {
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
        store.setPermission(address(this), PERM_SUPERUSER, false);
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
        if (supercededBy != address(0)) {
            store.setPermission(supercededBy, PERM_SUPERUSER, false);
        }
        super.revertUpgrade();
    }
}
