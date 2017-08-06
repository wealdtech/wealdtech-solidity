contract EternalStorage{
    mapping(bytes32 => uint256) UInt256Storage;

    function getUInt256Value(bytes32 record) constant returns (uint256) {
        return UInt256Storage[record];
    }

    function setUInt256Value(bytes32 record, uint256 value)
    {
        UInt256Storage[record] = value;
    }

    mapping(bytes32 => string) StringStorage;

    function getStringValue(bytes32 record) constant returns (string) {
        return StringStorage[record];
    }

    function setStringValue(bytes32 record, string value)
    {
        StringStorage[record] = value;
    }

    mapping(bytes32 => address) AddressStorage;

    function getAddressValue(bytes32 record) constant returns (address) {
        return AddressStorage[record];
    }

    function setAddressValue(bytes32 record, address value)
    {
        AddressStorage[record] = value;
    }

    mapping(bytes32 => bytes) BytesStorage;

    function getBytesValue(bytes32 record) constant returns (bytes) {
        return BytesStorage[record];
    }

    function setBytesValue(bytes32 record, bytes value)
    {
        BytesStorage[record] = value;
    }

    mapping(bytes32 => bool) BooleanStorage;

    function getBooleanValue(bytes32 record) constant returns (bool) {
        return BooleanStorage[record];
    }

    function setBooleanValue(bytes32 record, bool value)
    {
        BooleanStorage[record] = value;
    }
    
    mapping(bytes32 => int) IntStorage;

    function getIntValue(bytes32 record) constant returns (int) {
        return IntStorage[record];
    }

    function setIntValue(bytes32 record, int value)
    {
        IntStorage[record] = value;
    }
}
