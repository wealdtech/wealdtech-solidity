const ERC820Registry = artifacts.require('ERC820Registry');

module.exports = {
    instance: () => {
        return ERC820Registry.at('0x820b586C8C28125366C998641B09DCbE7d4cBF06');
    } 
}
