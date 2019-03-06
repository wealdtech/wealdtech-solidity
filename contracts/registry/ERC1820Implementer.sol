pragma solidity ^0.5.0;

import 'erc1820/contracts/ERC1820ImplementerInterface.sol';


/**
 * @title ERC1820Implementer
 *
 *        A helper for contracts that implement one or more ERC1820-registered
 *        interfaces.
 *
 * @author Jim McDonald
 */
contract ERC1820Implementer is ERC1820ImplementerInterface {
    mapping(bytes32=>bool) implemented;

    /**
     * implementInterface provides an easy way to note support of an interface
     */
    function implementInterface(string memory _interface) public {
        implemented[keccak256(abi.encodePacked(_interface))] = true;
    }

    /**
     * canImplementInterfaceForAddress is the ERC1820 function
     */
    function canImplementInterfaceForAddress(bytes32 _interfaceHash, address _addr) external view returns(bytes32) {
        (_addr);
        if (implemented[_interfaceHash]) {
            return ERC1820_ACCEPT_MAGIC;
        } else {
            return 0;
        }
    }
}
