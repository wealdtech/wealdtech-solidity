pragma solidity ^0.5.0;

import '../token/IERC777.sol';


/**
 * @title MerkleProofAuthority
 *
 *        An ERC777 token operator contract that requires a merkle proof from
 *        holder to allow the transfer to take place.
 *
 *        State of this contract: stable; development complete but the code is
 *        unaudited. and may contain bugs and/or security holes. Use at your own
 *        risk.
 *
 * @author Jim McDonald
 * @notice If you use this contract please consider donating some Ether or
 *         some of your ERC-777 token to wsl.wealdtech.eth to support continued
 *         development of these and future contracts
 */
contract MerkleProofAuthority {
    // Mapping is token=>holder=>merkle root
    mapping(address=>mapping(address=>bytes32)) private roots;

    // Mapping is hash=>used, to stop replays
    mapping(bytes32=>bool) private usedHashes;

    // Event emitted when a root is set
    event Root(address token, address holder, bytes32 root);

    /**
     * Set the merkle root for a holder of a token.
     * @param _token the address of the token contract
     * @param _root the root of the merkle tree
     */
    function setRoot(address _token, bytes32 _root) public {
        roots[_token][msg.sender] = _root;
        emit Root(_token, msg.sender, _root); 
    }

    function getRoot(address _token, address _holder) public view returns (bytes32) {
        return roots[_token][_holder];
    }

    /**
     * send tokens from one account to another using a merkle proof as the authority.
     * The signature is created by the holder and signs a hash of the
     * (_token, _holder, _recipient, _amount, _nonce) tuple as created by hashForSend().
     *
     * @param _token the address of the token contract
     * @param _holder the holder of the tokens
     * @param _recipient the recipient of the tokens
     * @param _amount the number of tokens to send
     * @param _data the data field for the operatorSend operation, supplied by the authority
     * @param _nonce a unique field for a given (_token, _holder, _recipient, _amount, _nonce) supplied by the authority
     * @param _path the path of the leaf through the merkle tree to the root
     * @param _proof the other hashes that form the merkle tree to the root
     */
    function send(IERC777 _token, address _holder, address _recipient, uint256 _amount, bytes memory _data, uint256 _nonce, uint256 _path, bytes32[] memory _proof) public {
        bytes32 hash = hashForSend(_token, _holder, _recipient, _amount, _data, _nonce);
        require(!usedHashes[hash], "tokens already sent");

        require(prove(hash, _path, _proof, roots[address(_token)][_holder]), "merkle proof invalid");
        usedHashes[hash] = true;

        _token.operatorSend(_holder, _recipient, _amount, _data, "");
    }

    /**
     * This generates the hash that is signed by the holder to authorise a send.
     *
     * @param _token the address of the token contract
     * @param _holder the holder of the tokens
     * @param _recipient the recipient of the tokens
     * @param _amount the number of tokens to send
     * @param _data the data field for the operatorSend operation, supplied by the authority
     * @param _nonce a unique field for a given (_token, _holder, _recipient, _amount, _nonce) supplied by the authority
     */
    function hashForSend(IERC777 _token, address _holder, address _recipient, uint256 _amount, bytes memory _data, uint256 _nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_token, _holder, _recipient, _amount, _data, _nonce));
    }

    /**
     * Prove that a given leaf is part of a merkle tree
     * @param _leaf the leaf to prove
     * @param _path the path to follow
     * @param _proof the intermediate nodes
     * @param _root the root
     */
    function prove(bytes32 _leaf, uint256 _path, bytes32[] memory _proof, bytes32 _root) private pure returns (bool) {
        bytes32 hash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            if ((_path & 0x01) == 1) {
                hash = keccak256(abi.encodePacked(hash, _proof[i]));
            } else {
                hash = keccak256(abi.encodePacked(_proof[i], hash));
            }
            _path = _path >> 1;
        }
        return (hash == _root);
    }
}
