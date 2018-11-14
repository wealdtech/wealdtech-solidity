pragma solidity ^0.4.24;

import 'erc820/contracts/ERC820ImplementerInterface.sol';


/**
 * @title ERC820Implementer
 *
 *        A helper for contracts that implement one or more ERC820-registered
 *        interfaces.
 *
 * @author Jim McDonald
 */
contract ERC820Implementer is ERC820ImplementerInterface {
    mapping(bytes32=>bool) implemented;

    /**
     * implementInterface provides an easy way to note support of an interface
     */
    function implementInterface(string _interface) public {
        implemented[keccak256(abi.encodePacked(_interface))] = true;
    }

    /**
     * canImplementInterfaceForAddress is the ERC820 function
     */
    function canImplementInterfaceForAddress(bytes32 _interfaceHash, address _addr) external view returns(bytes32) {
        (_addr);
        if (implemented[_interfaceHash]) {
            return ERC820_ACCEPT_MAGIC;
        } else {
            return 0;
        }
    }
}
