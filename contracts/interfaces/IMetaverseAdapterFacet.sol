// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMetaverseAdapterFacet {
    event MetaverseRegistryAdapterUpdated(
        address indexed _metaverseRegistry,
        address indexed _adapter
    );

    event UpdateOperator(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _operator
    );

    event UpdateAdapterOperator(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _adapter,
        address indexed _operator
    );

    function setMetaverseRegistryAdapter(
        uint256 _metaverseId,
        address _metaverseRegistry,
        address _adapter
    ) external;

    function rentWithOperator(
        uint256 _assetId,
        uint256 _period,
        address _operator,
        address _paymentToken,
        uint256 _amount
    ) external payable;

    function updateAdapterForRent(uint256 _assetId, uint256 _rentId) external;

    function rentOperator(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);
}
