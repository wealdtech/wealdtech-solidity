pragma solidity ^0.4.18;

import '../math/SafeMath.sol';
import '../token/ERC777TokensSender.sol';
import '../token/IERC777.sol';
import 'eip820/contracts/ERC820Implementer.sol';


/**
 * An ERC777 tokens sender contract that supplements a specified account with a
 * percentage of tokens transferred.  Commonly used to divert funds to a tax
 * account to avoid over-spending.
 *
 * For example, if the percentage is set to 15 and 100 tokens are to be sent
 * then this will send an additional 15 tokens from the sender to the holding
 * account.  If sufficient tokens are not available then this will revert.
 *
 * Note that because this contract transfers token on behalf of the sender it
 * requires operator privileges.
 */
contract SupplementAccountTokensSender is ERC777TokensSender, ERC820Implementer {
    using SafeMath for uint256;

    // The account to send the tokens
    mapping(address=>address) public accounts;
    // The percentage of tokens to send,  in 1/10000s of a percentage
    mapping(address=>uint16) public percentages;

    // An event emitted when a supplement is set
    event SupplementSet(address from, address to, uint16 percentage);
    // An event emitted when a supplement is removed
    event SupplementRemoved(address from);

    /**
     * setSuplement sets an account and percentage to which to send tokens
     * @param _address the address to which to send tokens
     * @param _percentage the percentage of additional tokens ot send,
     *        in 1/10000s of a percentage
     */
    function setSupplement(address _address, uint16 _percentage) public {
        require(_address != 0);
        accounts[msg.sender] = _address;
        percentages[msg.sender] = _percentage;
        emit SupplementSet(msg.sender, _address, _percentage);
    }

    /**
     * removeSupplement removes a supplement
     */
    function removeSupplement() public {
        accounts[msg.sender] = 0;
        percentages[msg.sender] = 0;
        emit SupplementRemoved(msg.sender);
    }

    event Supplement(uint256 value);
    function tokensToSend(address operator, address from, address to, uint256 value, bytes userData, bytes operatorData) public {
        require(accounts[from] != 0);

        // Ignore tokens being sent to the target account
        if (to == accounts[from]) {
            return;
        }

        // (value, userData, operator, operatorData);
        IERC777 tokenContract = IERC777(msg.sender);
        // Calculate the additional tokens to send
        uint256 supplement = value.mul(uint256(percentages[from])).div(uint256(10000));
        // Round up in the case of the value being an odd granularity
        uint256 granularity = tokenContract.granularity();
        if (supplement % granularity != 0) {
            supplement = (supplement.div(granularity)+1).mul(granularity);
        }
        emit Supplement(supplement);
        // Transfer the tokens - this throws if it fails
        tokenContract.operatorSend(from, accounts[from], supplement, userData, operatorData);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) pure public returns(bytes32) {
        (addr);
        if (interfaceHash == keccak256("ERC777TokensSender")) {
            return keccak256("ERC820_ACCEPT_MAGIC");
        } else {
            return 0;
        }   
    }
}
