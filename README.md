# Wealdtech Solidity

Contracts and contract pieces for Solidity.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/wealdtech/wealdtech-solidity)

# What is this?

Wealdtech Solidity provides a number of contracts, some with specific functionality and others complete examples.  A brief overview of each contract is provided below; full details of the functionality and operation of each contract is available in the relevant source code.

## Authorisation

### Permissioned

Permission structure and modifiers.  Permissions are described by the tuple (address, permission id).  The permission ID is a keccak256() hash of a developer-selected string.  It is recommended that the developer use a (short) prefix for their permissions to avoid clashes, for example a permission might be called "my contract: upgrade".

## ENS

### ENSReverseRegister

ENS resolves names to addresses, and addresses to names.  But to set the resolution from address to name the transaction must come from the address in question.  This contract sets the reverse resolution as part of the contract initialisation.

## Lifecycle

### Pausable

Pausable provides a toggle for the operation of contract functions.  This is accomplished through a combination of functions and modifiers.  The functions pause() and unpause() toggle the internal flag, and the modifiers ifPaused and ifNotPaused throw if the flag is not in the correct state.

### Redirectable

Redirectable provides a mechanism for contracts to be able to provide potential callees with the address of the contract that should be called instead of this one.  It is commonly used when a contract has been upgraded and should no longer be called.

## Token

### TokenStore

TokenStore provides storage for an ERC-20 contract separate from the contract itself.  This separation of token logic and storage allows upgrades to token functionality without requiring expensive copying of the token allocation information.

### Token

Token is an ERC-20 compliant token implementation with significantly upgraded functionality including a separate token store, cheap bulk transfers and easy upgrading.

### TokenAgent

TokenAgent is an abstract contract that issues tokens from an ERC-20 source.

### FaucetAgent

FaucetAgent is a simple token agent that sells its tokens at a fixed exchange rate.

