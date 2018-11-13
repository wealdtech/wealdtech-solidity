pragma solidity ^0.4.24;

import '../math/SafeMath.sol';
import '../token/IERC777.sol';


/**
 * @title FixedAllowance
 *
 *        An ERC777 token operator contract that releases a limited number of
 *        tokens for a given (token, holder, transferer).
 *        
 *        To use this contract a token holder should first call setAllowance()
 *        to set the allowance for a given accoutn.  That account will then be
 *        able to transfer away that number of tokens.
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
contract FixedAllowance {
    using SafeMath for uint256;

    // Mapping is token=>holder=>recipient=>allowance
    mapping(address=>mapping(address=>mapping(address=>uint256))) private allowances;

    event Allowance(address token, address holder, address transferer, uint256 amount);

    /**
      * Set the allowance for a given (_token, _holder, _recipient)
      * @param _token the address of the token contract
      * @param _recipient the address of the recipient
      * @param _oldAllowance the amount of tokens previously allowed
      * @param _allowance the amount of tokens to allow
      */
    function setAllowance(IERC777 _token, address _recipient, uint256 _oldAllowance, uint256 _allowance) public {
        require(allowances[_token][msg.sender][_recipient] == _oldAllowance, "old allowance does not match current allowance");
        allowances[_token][msg.sender][_recipient] = _allowance;
        emit Allowance(_token, msg.sender, _recipient, _allowance);
    }

    /*
     * Get the allowance for a given (_token, _holder, _recipient)
     * @param _token the address of the token contract
     * @param _holder the address of the holder
     * @param _recipient the address of the recipient
     * @return the allowance
     */
    function getAllowance(IERC777 _token, address _holder, address _recipient) public view returns (uint256) {
        return allowances[_token][_holder][_recipient];
    }

    function send(IERC777 _token, address _holder, address _recipient, uint256 _amount) public {
        confirmAllowed(_token, _holder, msg.sender, _amount);
        updateState(_token, _holder, msg.sender, _amount);
        _token.operatorSend(_holder, _recipient, _amount, "", "");
    }

    function confirmAllowed(IERC777 _token, address _holder, address _transferer, uint256 _amount) internal view {
        require(_amount <= allowances[_token][_holder][_transferer], "amount exceeds allowance");
    }

    function updateState(IERC777 _token, address _holder, address _transferer, uint256 _amount) internal {
        allowances[_token][_holder][_transferer] = allowances[_token][_holder][_transferer].sub(_amount);
    }
}
