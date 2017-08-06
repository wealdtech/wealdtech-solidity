pragma solidity ^0.4.11;


/**
 * @title Owned
 * Ownership structure and modifiers.  Allows transfer of ownership on an
 * offer/claim basis.
 */
contract Owned {
    address public contractOwner;
    address public pendingContractOwner;

    /**
     * @dev The Owned construtor sets the initial contract owner to be the
     * contract creator.
     */
    function Owned() {
        contractOwner = msg.sender;
    }

    /**
     * @dev A modifier that requires the message sender to be the current
     * contract owner.
     */
    modifier onlyContractOwner {
        require(msg.sender == contractOwner);
        _;
    }
  
    /**
     * @dev A modifier that requires the message sender to be the pending
     * contract owner.
     */
    modifier onlyPendingContractOwner() {
        require(msg.sender == pendingContractOwner);
        _;
    }

    /**
     * @dev A modifier that places no restriction on the message sender.
     */
    modifier anyone() {
        _;
    }

    /**
     * @dev Offer the ownership of the contract to a new address. This has no
     * immediate impact as it requires the new contract owner to call
     * `claimContractOwnership` before the owner is changed.
     * Note that there can only be one offer to change ownership pending at
     * any one time.  If another call is made to this function it will
     * invalidate any prior offers.
     */
    function offerContractOwnership(address newContractOwner) public onlyContractOwner {
        pendingContractOwner = newContractOwner;
    }

    /**
     * @dev Claim the ownership of the contract previously offered by
     * `offerContractOwnership`.  This will change ownership of the
     * contract.
     */
    function claimContractOwnership() public onlyPendingContractOwner {
        contractOwner = pendingContractOwner;
        pendingContractOwner = 0x0;
    }
}
