pragma solidity ^0.5.0;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../registry/ERC1820Implementer.sol';


/**
 * @title OperatorAllowance
 *
 *        An ERC777 tokens sender contract that provides operators with an
 *        allowance of tokens to send rather than complete control of all
 *        tokens in the sender's account.
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
contract OperatorAllowance is ERC777TokensSender, ERC1820Implementer {
    using SafeMath for uint256;

    // Mapping is holder=>operator=>token=>allowance
    mapping(address=>mapping(address=>mapping(address=>uint256))) public allowances;

    // An event emitted when an allowance is set
    event AllowanceSet(address holder, address operator, address token, uint256 allowance);

    constructor() public {
        implementInterface("ERC777TokensSender");
    }

    /**
     * setAllowance sets an allowance.
     */
    function setAllowance(address _operator, address _token, uint256 _currentAllowance, uint256 _newAllowance) external {
        require(allowances[msg.sender][_operator][_token] == _currentAllowance, "current allowance incorrect");
        allowances[msg.sender][_operator][_token] = _newAllowance;
        emit AllowanceSet(msg.sender, _operator, _token, _newAllowance);
    }

    /**
     * getAllowance gets an allowance.
     */
    function getAllowance(address _holder, address _operator, address _token) external view returns (uint256) {
        return allowances[_holder][_operator][_token];
    }

    function tokensToSend(address operator, address holder, address recipient, uint256 amount, bytes calldata data, bytes calldata operatorData) external {
        (recipient, data, operatorData);

        if (operator == holder) {
            // This is a user send not an operator send; ignore
            return;
        }

        require (allowances[holder][operator][msg.sender] >= amount, "allowance too low");
        allowances[holder][operator][msg.sender] = allowances[holder][operator][msg.sender].sub(amount);
    }
}
