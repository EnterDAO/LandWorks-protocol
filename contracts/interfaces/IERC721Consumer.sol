// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title ERC-721 Consumer Role extension
/// Note: the ERC-165 identifier for this interface is 0x953c8dfa
/* is ERC721 */
interface IERC721Consumer {
    /**
     * @dev Emitted when owner or approved enables `consumer` to consume the `tokenId` token.
     */
    event ConsumerChanged(
        address indexed owner,
        address indexed consumer,
        uint256 indexed tokenId
    );

    /// @notice Get the consumer of a token
    /// @dev address(0) consumer address indicates that there is no consumer currently set for that token
    /// @param tokenId The identifier for a token
    /// @return The address of the consumer of the token
    function consumerOf(uint256 tokenId) external view returns (address);

    /// @notice Set the address of the new consumer for the given token instance
    /// @dev Throws unless `msg.sender` is the current owner, an authorised operator, or the approved address for this token. Throws if `tokenId` is not valid token
    /// @dev Set newConsumer to address(0) to renounce the consumer role
    /// @param newConsumer The address of the new consumer for the token instance
    function changeConsumer(address newConsumer, uint256 tokenId) external;
}
