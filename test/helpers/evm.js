module.exports = {
    increaseTime: async (addSeconds) => {
        return await web3.currentProvider.send('evm_increaseTime', [addSeconds]);
    },
    mine: () => {
        return web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 });
    },
    currentOffset: async () => {
        if (typeof web3.currentProvider.sendAsync !== "function") {
            web3.currentProvider.sendAsync = function() {
                return web3.currentProvider.send.apply(
                    web3.currentProvider, arguments
                );
            };
        }

        //console.log(web3.currentProvider.sendAsync({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0}));
        //console.log(web3.currentProvider.send.apply(web3.currentProvider, { jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0}));
        //console.log(await web3.currentProvider.sendAsync({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0}));
        //console.log(await web3.currentProvider.send.apply(web3.currentProvider, { jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0}));
        return await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0});
    }
}
