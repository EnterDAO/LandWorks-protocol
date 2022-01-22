// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./IAdapterV1.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Version 1 adapter for metaverse integrations
/// @author Daniel K Ivanov
/// @notice Adapter for metaverses that lack the necessary operator role required to be integrated into LandWorks
contract AdapterV1 is IAdapterV1 {

    /// @notice LandWorks address
    address public immutable landworks;
    /// @notice NFT Token address
    IERC721 public immutable token;

    /// @notice mapping of authorised operator addresses
    mapping(uint256 => address) public operators;

    constructor (address _landworks, address _token) {
        landworks = _landworks;
        token = IERC721(_token);
    }

    /// @dev See {IAdapterV1-setOperator}
    function setOperator(uint256 tokenId, address operator) external {
        require(msg.sender == landworks, "Adapter: sender is not LandWorks");
        require(msg.sender == token.ownerOf(tokenId), "Adapter: sender is not owner of tokenId");

        operators[tokenId] = operator;
        emit OperatorUpdated(tokenId, operator);
    }

}
