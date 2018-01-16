#!/bin/bash

# Mainnet
#REGISTRY='314159265dD8dbb310642f98f50C066173C1259b'
#IPC=/home/jgm/.ethereum/geth.ipc
#NETWORK=
# Ropsten
REGISTRY='112234455c3a32fd11230c42e7bccd4a84e02010'
FROM='0x388ea662ef2c223ec0b047d41bf3c0f362142ad5'
IPC=https://ropsten.orinocopay.com:8546/
#IPC=/home/jgm/.ethereum/testnet/geth.ipc
#NETWORK='--testnet'
# Rinkeby
#REGISTRY='e7410170f87102df0055eb195163a03b7f2bff4a'
#IPC=/home/jgm/.ethereum/rinkeby/geth.ipc

BIN=`solc node_modules=node_modules --combined-json=bin contracts/ens/DnsResolver.sol  | jq -r '.["contracts"]["contracts/ens/DnsResolver.sol:DnsResolver"]["bin"]'`
BIN="0x${BIN}000000000000000000000000${REGISTRY}"
ethereal contract deploy --connection=${IPC} --data=${BIN} --from=${FROM} --passphrase=throwaway --gasprice=4gwei
#echo "var input=`solc node_modules=node_modules --optimize --combined-json abi,bin,interface contracts/ens/DnsResolver.sol`" > contract.js


# First address is the ENS registry
#geth ${NETWORK} attach ${IPC} <<EOGETH
#loadScript('contract.js');
#var contract = web3.eth.contract(JSON.parse(input.contracts["contracts/ens/DnsResolver.sol:DnsResolver"].abi));
#personal.unlockAccount(eth.accounts[0], "throwaway");
#var partial = contract.new("${REGISTRY}", { from: eth.accounts[0], data: "0x" + input.contracts["contracts/ens/DnsResolver.sol:DnsResolver"].bin, gas: 4700000, gasPrice: web3.toWei(120, 'gwei')});
#console.log(partial.transactionHash);
#EOGETH

#rm -f contract.js
