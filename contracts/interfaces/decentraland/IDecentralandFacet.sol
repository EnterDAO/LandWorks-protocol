// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDecentralandFacet {
    event Rent(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _renter,
        uint256 _start,
        uint256 _end,
        address _paymentToken,
        uint256 _fee
    );
    event UpdateState(uint256 _assetId, uint256 _rentId, address _operator);
    event UpdateAdministrativeState(
        uint256 _assetId,
        address indexed _operator
    );
    event UpdateOperator(uint256 _assetId, uint256 _rentId, address _operator);
    event UpdateAdministrativeOperator(address _administrativeOperator);

    /// @notice Rents Decentraland Estate/LAND.
    /// @param _assetId The target asset
    /// @param _period The target period of the rental
    /// @param _operator The target operator, which will be set as operator once the rent is active
    function rentDecentraland(
        uint256 _assetId,
        uint256 _period,
        address _operator
    ) external payable;

    /// @notice Updates the corresponding Estate/LAND operator from the given rent.
    /// When the rent becomes active (the current block.timestamp is between the rent's start and end),
    /// this function should be executed to set the provided rent operator to the Estate/LAND scene operator.
    /// @param _assetId The target asset which will map to its corresponding Estate/LAND
    /// @param _rentId The target rent
    function updateState(uint256 _assetId, uint256 _rentId) external;

    /// @notice Updates the corresponding Estate/LAND operator with the administrative operator
    /// @param _assetId The target asset which will map to its corresponding Estate/LAND
    function updateAdministrativeState(uint256 _assetId) external;

    /// @notice Updates the operator for the given rent of an asset
    /// @param _assetId The target asset
    /// @param _rentId The target rent for the asset
    /// @param _newOperator The to-be-set new operator
    function updateOperator(
        uint256 _assetId,
        uint256 _rentId,
        address _newOperator
    ) external;

    /// @notice Updates the administrative operator
    /// @param _administrativeOperator The to-be-set administrative operator
    function updateAdministrativeOperator(address _administrativeOperator)
        external;

    /// @notice Gets the administrative operator
    function administrativeOperator() external view returns (address);

    /// @notice Gets the operator of the rent for the an asset
    /// @param _assetId The target asset
    /// @param _rentId The target rentId
    function operatorFor(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);
}
