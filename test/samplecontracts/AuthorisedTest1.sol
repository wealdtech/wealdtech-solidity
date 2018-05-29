pragma solidity ^0.4.23;

import '../../contracts/auth/Authorised.sol';


// Authorised contract for testing
contract AuthorisedTest1 is Authorised {
    bytes32 constant public ACTION_SET_INT = keccak256("action: set int");
    bytes32 constant public ACTION_SET_INT_ONCE = keccak256("action: set int once");

    uint256 public intValue = 0;

    function hash() public view returns (bytes32) {
        return keccak256(abi.encodePacked(msg.sender, ACTION_SET_INT, uint256(8)));
    }

    event Mark(bool);
    function setInt(uint256 _intValue, bytes _signature) public {
        // check general authorisation
        if (!authorise(keccak256(abi.encodePacked(msg.sender, ACTION_SET_INT)), _signature, true)) {
            // check single-use authorisation
            if(!authorise(keccak256(abi.encodePacked(msg.sender, ACTION_SET_INT_ONCE)), _signature, false)) {
                // check general authorisation with value
                if (!authorise(keccak256(abi.encodePacked(msg.sender, ACTION_SET_INT, _intValue)), _signature, true)) {
                    // Check single-use authorisation with value
                    require(authorise(keccak256(abi.encodePacked(msg.sender, ACTION_SET_INT_ONCE, _intValue)), _signature, false));
                }
            }
        }
        intValue = _intValue;
    }
}
