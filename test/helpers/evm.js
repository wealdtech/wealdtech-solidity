module.exports = {
    increaseTime: async (addSeconds) => {
//        return await web3.currentProvider.send('evm_increaseTime', [addSeconds]);
        var res;
        await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [addSeconds], id: 0}, (err, r) => { res = r });
        while (res == undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return res;
    },
    mine: async () => {
//        return web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 });
        var res;
        await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0}, (err, r) => { res = r });
        while (res == undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return res;
    },
    currentOffset: async () => {
//        if (typeof web3.currentProvider.sendAsync !== "function") {
//            web3.currentProvider.sendAsync = function() {
//                return web3.currentProvider.send.apply(
//                    web3.currentProvider, arguments
//                );
//            };
//        }

        var res;
        await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0}, (err, r) => { res = r });
        while (res == undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return res;

        // return await web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [0], id: 0});
    }
}
