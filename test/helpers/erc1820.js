const ERC1820Registry = artifacts.require('ERC1820Registry');

module.exports = {
    instance: () => {
        return ERC1820Registry.at('0x1820b744B33945482C17Dc37218C01D858EBc714');
    } 
}
