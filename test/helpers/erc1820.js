const ERC1820Registry = artifacts.require('ERC1820Registry');

module.exports = {
    instance: () => {
        return ERC1820Registry.at('0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24');
    } 
}
