// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDecentralandFacet {
    event Rent(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _renter,
        uint256 _start,
        uint256 _end,
        uint256 _fee
    );
    event RentDecentraland(
        uint256 indexed _assetId,
        uint256 _rentId,
        address _operator
    );
    event UpdateState(uint256 _assetId, uint256 _rentId, address _operator);
    event UpdateAdministrativeState(
        uint256 _assetId,
        address indexed _operator
    );
    event UpdateOperator(uint256 _assetId, uint256 _rentId, address _operator);
    event UpdateAdministrativeOperator(address _administrativeOperator);

    function rentDecentraland(
        uint256 _assetId,
        uint256 _period,
        address _operator
    ) external payable;

    function updateState(uint256 _assetId, uint256 _rentId) external;

    function updateAdministrativeState(uint256 _assetId) external;

    function updateOperator(
        uint256 _assetId,
        uint256 _rentId,
        address _operator
    ) external;

    function updateAdministrativeOperator(address _administrativeOperator)
        external;

    function administrativeOperator() external view returns (address);

    function operatorFor(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);
}
