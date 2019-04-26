pragma solidity ^0.5.0;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../token/IERC777.sol';
import '../registry/ERC1820Implementer.sol';


/**
 * @title SupplementWitholdingAccount
 *
 *        An ERC777 tokens sender contract that supplements a specified account
 *        with a percentage of tokens transferred.  Commony used to divert funds
 *        to a tax witholding account to avoid over-spending.
 *
 *        For example, if the percentage is set to 15 and 100 tokens are to be
 *        sent then this will send an additional 15 tokens from the sender to
 *        the holding account.  If sufficient tokens are not available then this
 *        will revert.
 *
 *        Note that because this contract transfers token on behalf of the
 *        sender it requires operator privileges.
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
contract SupplementWitholdingAccount is ERC777TokensSender, ERC1820Implementer {
    using SafeMath for uint256;

    // The account to send the tokens
    mapping(address=>address) public accounts;
    // The percentage of tokens to send,  in 1/10000s of a percentage
    mapping(address=>uint16) public percentages;

    // An event emitted when a supplement is set
    event SupplementSet(address holder, address target, uint16 percentage);
    // An event emitted when a supplement is removed
    event SupplementRemoved(address holder);

    constructor() public {
        implementInterface("ERC777TokensSender", false);
    }

    /**
     * setSuplement sets an account and percentage to which to send tokens
     * @param _target the address to which to send tokens
     * @param _percentage the percentage of additional tokens to send,
     *        in 1/10000s of a percentage
     */
    function setSupplement(address _target, uint16 _percentage) external {
        require(_target != address(0), "target address cannot be 0");
        accounts[msg.sender] = _target;
        percentages[msg.sender] = _percentage;
        emit SupplementSet(msg.sender, _target, _percentage);
    }

    /**
     * removeSupplement removes a supplement
     */
    function removeSupplement() external {
        accounts[msg.sender] = address(0);
        percentages[msg.sender] = 0;
        emit SupplementRemoved(msg.sender);
    }

    function tokensToSend(address operator, address holder, address recipient, uint256 value, bytes calldata data, bytes calldata operatorData) external {
        (operator);

        require(accounts[holder] != address(0), "target address not set");

        // Ignore tokens already being sent to the target account
        if (recipient == accounts[holder]) {
            return;
        }

        IERC777 tokenContract = IERC777(msg.sender);
        // Calculate the additional tokens to send
        uint256 supplement = value.mul(uint256(percentages[holder])).div(uint256(10000));
        // Round up in the case of the value being an odd granularity
        uint256 granularity = tokenContract.granularity();
        if (supplement % granularity != 0) {
            supplement = (supplement.div(granularity)+1).mul(granularity);
        }
        // Transfer the tokens - this throws if it fails
        tokenContract.operatorSend(holder, accounts[holder], supplement, data, operatorData);
    }
}
