// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./IConsumableAdapterV1.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Version 1 adapter for metaverse integrations
/// @author Daniel K Ivanov
/// @notice Adapter for metaverses that lack the necessary consumer role required to be integrated into LandWorks
/// For reference see https://eips.ethereum.org/EIPS/eip-4400
contract ConsumableAdapterV1 is IConsumableAdapterV1 {
    /// @notice LandWorks address
    address public immutable landworks;
    /// @notice NFT Token address
    IERC721 public immutable token;

    /// @notice mapping of authorised consumer addresses
    mapping(uint256 => address) public consumers;

    constructor(address _landworks, address _token) {
        landworks = _landworks;
        token = IERC721(_token);
    }

    /// @dev See {IConsumableAdapterV1-setConsumer}
    function setConsumer(uint256 tokenId, address consumer) external {
        require(
            msg.sender == landworks,
            "ConsumableAdapter: sender is not LandWorks"
        );
        require(
            msg.sender == token.ownerOf(tokenId),
            "ConsumableAdapter: sender is not owner of tokenId"
        );

        consumers[tokenId] = consumer;
        emit ConsumerUpdated(tokenId, consumer);
    }
}
