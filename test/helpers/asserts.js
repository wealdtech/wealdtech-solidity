module.exports = {
    // asserTokenBalances expects a standard(ish) contract and map of account=>balance pairs
    assertTokenBalances: async (tokenContract, balances) => {
        for (var account in balances) {
            // Compare friendly strings to help with error message viewing
            assert.equal((await tokenContract.balanceOf(account)).toString(), balances[account].toString());
        }
        // Also compare total supply
        const totalSupply = Object.values(balances).reduce((a, b) => a.add(b), web3.utils.toBN('0'));
        assert.equal((await tokenContract.totalSupply()).toString(), totalSupply.toString(), 'Total supply is incorrect');
    }
}
