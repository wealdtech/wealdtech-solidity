pragma solidity ^0.4.11;


/**
 * @title Router
 *        Router is a contract that routes transactions to different contracts.
 *
 *        Only one route can exist for a given method signature.  If two
 *        attempts are made to register two methods with the same signature the
 *        second will overwrite the first
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-20 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract Router {
    // A route
    struct Route {
        address target;
        uint32 returnSize;
    }

    // Mapping from function signatures to routes
    mapping (bytes4 => Route) routes;

    function addRoutes(address _target) {
        _target.delegatecall(bytes4(sha3("addRoutes(address)")), _target);
    }

    function addRoute(bytes4 funcSig, address _target, uint32 _returnSize) {
        routes[funcSig] = Route({target: _target, returnSize: _returnSize});
    }

    function removeRoute(bytes4 sig) {
        delete routes[sig];
    }

    // Default function routes
    function () payable {
        // Obtain the signature of the function being called
        bytes4 funcSig;
        assembly {
            funcSig := calldataload(0)
        }

        // Obtain the route for the function
        Route storage route = routes[funcSig];
        address target = route.target;
        uint32 returnSize = route.returnSize;

        // Call the function and return the data
        assembly {
            calldatacopy(0x0, 0x0, calldatasize)
            let ret := delegatecall(sub(gas, 10000), target, 0x0, calldatasize, 0, returnSize)
            jumpi(0x02, iszero(ret))
            return(0, returnSize)
        }
    }
}
