// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IAdapterV1 {

    event OperatorUpdated(uint256 indexed tokenId, address indexed operator);

    /// @notice Sets the operator of the tokenId to the specified address
    /// @param tokenId The token to update the operator of
    /// @param operator The operator to be set
    function setOperator(uint256 tokenId, address operator) external;
}
