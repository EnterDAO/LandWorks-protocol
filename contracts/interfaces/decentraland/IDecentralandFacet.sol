// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDecentralandFacet {
    event RentDecentraland(uint256 _eNft, uint256 _rentId, address _operator);
    event UpdateState(uint256 _eNft, uint256 _rentId, address _operator);
    event UpdateAdministrativeState(uint256 _eNft, address indexed _operator);
    event UpdateOperator(uint256 _eNft, uint256 _rentId, address _operator);
    event UpdateAdministrativeOperator(address _administrativeOperator);

    function rentDecentraland(
        uint256 _eNft,
        uint256 _period,
        address _operator
    ) external payable;

    function updateState(uint256 _eNft, uint256 _rentId) external;

    function updateAdministrativeState(uint256 _eNft) external;

    function updateOperator(
        uint256 _eNft,
        uint256 _rentId,
        address _operator
    ) external;

    function updateAdministrativeOperator(address _administrativeOperator)
        external;
}
