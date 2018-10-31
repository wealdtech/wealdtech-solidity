pragma solidity ^0.4.24;

import 'erc820/contracts/ERC820ImplementerInterface.sol';


/**
 * @title ERC820Implementer
 *
 *        A helper for contracts that implement an ERC820-registered interface.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
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
    function canImplementInterfaceForAddress(bytes32 _interfaceHash, address _addr) public view returns(bytes32) {
        (_addr);
        if (implemented[_interfaceHash]) {
            // keccak256("ERC820_ACCEPT_MAGIC") == 0xf2294ee098a1b324b4642584abe5e09f1da5661c8f789f3ce463b4645bd10aef
            return 0xf2294ee098a1b324b4642584abe5e09f1da5661c8f789f3ce463b4645bd10aef;
        } else {
            return 0;
        }
    }
}
