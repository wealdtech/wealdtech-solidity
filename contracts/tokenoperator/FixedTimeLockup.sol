pragma solidity ^0.5.0;

import '../token/IERC777.sol';
import './FixedTimeRelease.sol';
import './FixedAllowance.sol';


/**
 * @title FixedTimeLockup
 *
 *        An ERC777 token operator contract that releases a limited number of
 *        tokens for a given (token, holder, transferer) as well as having a
 *        timestamp lock for the release of the tokens.
 *
 *        This is a combination of the FixedTimeRelease and FixedAllowance
 *        token operator contracts.
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract FixedTimeLockup is FixedTimeRelease, FixedAllowance {
    function send(IERC777 _token, address _holder, address _recipient, uint256 _amount) public {
        preSend(_token, _holder, msg.sender, _amount);
        _token.operatorSend(_holder, _recipient, _amount, "", "");
    }

    function preSend(IERC777 _token, address _holder, address _transferer, uint256 _amount) internal {
        FixedTimeRelease.preSend(_token, _holder);
        FixedAllowance.preSend(_token, _holder, _transferer, _amount);
    }
}
