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

### Managed

Managed provides full lifecycle management for contracts.  A managed contract provides a number of benefits.  The primary one is reducing the number of failed transactions by providing information about the state of the contract prior to sending transactions.  This cuts down on unnecessary network operations as well as reducing funds lost to transactions that will not complete successfully.

## Token

### ITokenStore

ITokenStore is the interface for storing tokens as part of a token.

### SimpleTokenStore

SimpleTokenStore provides permissioned storage for an ERC-20 contract separate from the contract itself.  This separation of token logic and storage allows upgrades to token functionality without requiring expensive copying of the token allocation information.

### DividendTokenStore

DividendTokenStore is an enhancement of the SimpleTokenStore that provides the ability to issue token-based dividends in an efficient manner.

### IERC20

IERC20 is the interface for ERC20-compliant tokens.

### Token

Token is an ERC20-compliant token implementation with significantly upgraded functionality including a separate token store, cheap bulk transfers and easy upgrading.

### ITokenAgent

ITokenAgent is the interface for contracts that issue tokens from an ERC20 source.

### FixedPriceTokenAgent

FixedPriceTokenAgent is a simple token agent that sells its tokens at a fixed exchange rate.

