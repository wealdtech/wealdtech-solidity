pragma solidity ^0.4.11;

import './Router.sol';


/**
 * @title Routable
 *        Routable is a way of allowing functions to be called by a router.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Routable {

    // Copy of items from Router that we need to compile setRoutes()
    struct Route {
        address target;
        uint32 returnSize;
    }

    // Mapping from function signatures to routes
    mapping (bytes4 => Route) routes;

    function addRoutes(address _this) {
        // Must be overridden
        revert();
    }
}
