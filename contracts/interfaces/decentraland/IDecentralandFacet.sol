// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../IRentable.sol";

interface IDecentralandFacet is IRentable {
    event UpdateState(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _operator
    );
    event UpdateAdministrativeState(
        uint256 indexed _assetId,
        address indexed _operator
    );
    event UpdateOperator(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _operator
    );
    event UpdateAdministrativeOperator(address _administrativeOperator);

    /// @notice Rents Decentraland Estate/LAND.
    /// @param _assetId The target asset
    /// @param _period The target period of the rental
    /// @param _maxRentStart The maximum rent start allowed for the given rent
    /// @param _operator The target operator, which will be set as operator once the rent is active
    /// @param _paymentToken The current payment token for the asset
    /// @param _amount The target amount to be paid for the rent
    /// @param _referrer The target referrer
    function rentDecentraland(
        uint256 _assetId,
        uint256 _period,
        uint256 _maxRentStart,
        address _operator,
        address _paymentToken,
        uint256 _amount,
        address _referrer
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

    /// @notice Clears the operators of Decentraland LANDs, which are part of a Decentraland Estate.
    /// @dev LANDs' operators, which are part of an Estate, are not cleared upon Estate transfer.
    /// The function's goal is to have the possibility to clear the operators of LANDs, which have been set
    /// before the estate has been listed in LandWorks, otherwise whenever someone rents the estate, there might
    /// be other operators, who can override the renter's scene.
    /// @param _assetIds - The list of LandWorks asset ids.
    /// @param _landIds - The list of landIds for each asset.
    function clearEstateLANDOperators(
        uint256[] memory _assetIds,
        uint256[][] memory _landIds
    ) external;

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
