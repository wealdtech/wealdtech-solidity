const erc820Addr = '0xE6C244a1C10Aa0085b0cf92f04cdaD947C2988b8';

module.exports = async function(deployer) {
    const accounts = await web3.eth.getAccounts();
    const account = accounts[9];

    // Need to give the ERC820 address some funds so that it can deploy the contract
    await web3.eth.sendTransaction({from: account, to: erc820Addr, value: web3.utils.toWei('0.1', 'ether')});
    // Now deploy the contract (if we haven't already)
    const nonce = await web3.eth.getTransactionCount(erc820Addr);
    if (nonce == 0) {
        await web3.eth.sendSignedTransaction('0xf90a2a8085174876e800830c35008080b909d7608060405234801561001057600080fd5b506109b7806100206000396000f30060806040526004361061008d5763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166329965a1d81146100925780633d584063146100bf5780635df8122f146100fc57806365ba36c114610123578063a41e7d5114610155578063aabbb8ca14610183578063b7056765146101a7578063f712f3e8146101e9575b600080fd5b34801561009e57600080fd5b506100bd600160a060020a036004358116906024359060443516610217565b005b3480156100cb57600080fd5b506100e0600160a060020a0360043516610512565b60408051600160a060020a039092168252519081900360200190f35b34801561010857600080fd5b506100bd600160a060020a036004358116906024351661055e565b34801561012f57600080fd5b506101436004803560248101910135610655565b60408051918252519081900360200190f35b34801561016157600080fd5b506100bd600160a060020a0360043516600160e060020a0319602435166106e3565b34801561018f57600080fd5b506100e0600160a060020a036004351660243561076d565b3480156101b357600080fd5b506101d5600160a060020a0360043516600160e060020a0319602435166107e7565b604080519115158252519081900360200190f35b3480156101f557600080fd5b506101d5600160a060020a0360043516600160e060020a03196024351661089c565b6000600160a060020a0384161561022e5783610230565b335b90503361023c82610512565b600160a060020a03161461029a576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6102a38361091c565b156102f8576040805160e560020a62461bcd02815260206004820152601960248201527f4d757374206e6f74206265206120455243313635206861736800000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103195750600160a060020a0382163314155b156104a15760405160200180807f4552433832305f4143434550545f4d414749430000000000000000000000000081525060130190506040516020818303038152906040526040518082805190602001908083835b6020831061038d5780518252601f19909201916020918201910161036e565b51815160209384036101000a6000190180199092169116179052604080519290940182900382207f249cb3fa000000000000000000000000000000000000000000000000000000008352600483018a9052600160a060020a0388811660248501529451909650938816945063249cb3fa936044808401945091929091908290030181600087803b15801561042057600080fd5b505af1158015610434573d6000803e3d6000fd5b505050506040513d602081101561044a57600080fd5b5051146104a1576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03808216600090815260016020526040812054909116151561053c575080610559565b50600160a060020a03808216600090815260016020526040902054165b919050565b3361056883610512565b600160a060020a0316146105c6576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146105e557806105e8565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b60008282604051602001808383808284378201915050925050506040516020818303038152906040526040518082805190602001908083835b602083106106ad5780518252601f19909201916020918201910161068e565b6001836020036101000a038019825116818451168082178552505050505050905001915050604051809103902090505b92915050565b6106ed82826107e7565b6106f85760006106fa565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b60008080600160a060020a038516156107865784610788565b335b91506107938461091c565b156107b85750826107a4828261089c565b6107af5760006107b1565b815b92506107df565b600160a060020a038083166000908152602081815260408083208884529091529020541692505b505092915050565b60008080610815857f01ffc9a70000000000000000000000000000000000000000000000000000000061093e565b9092509050811580610825575080155b1561083357600092506107df565b61084585600160e060020a031961093e565b909250905081158061085657508015155b1561086457600092506107df565b61086e858561093e565b90925090506001821480156108835750806001145b1561089157600192506107df565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108e4576108dd83836107e7565b90506106dd565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160088189617530fa9051909690955093505050505600a165627a7a723058204fc4461c9d5a247b0eafe0f9c508057bc0ad72bc24668cb2a35ea65850e10d3100291ba08208208208208208208208208208208208208208208208208208208208208200a00820820820820820820820820820820820820820820820820820820820820820', {from: erc820Addr});
    }
}
