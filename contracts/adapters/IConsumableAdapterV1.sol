// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IConsumableAdapterV1 {
    event ConsumerUpdated(uint256 indexed tokenId, address indexed consumer);

    /// @notice Sets the consumer of the tokenId to the specified address
    /// @param tokenId The token to update the consumer of
    /// @param consumer The consumer to be set
    function setConsumer(uint256 tokenId, address consumer) external;
}
