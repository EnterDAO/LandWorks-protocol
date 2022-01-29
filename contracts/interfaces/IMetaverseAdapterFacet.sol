// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMetaverseAdapterFacet {
    event MetaverseRegistryAdapterUpdated(
        address indexed _metaverseRegistry,
        address indexed _adapter
    );

    event MetaverseRegistryAdministrativeOperatorUpdated(
        address indexed _metaverseRegistry,
        address indexed _adapter
    );

    event UpdateRentOperator(
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

    event UpdateAdapterAdministrativeOperator(
        uint256 indexed _assetId,
        address indexed _adapter,
        address indexed _operator
    );

    function setMetaverseRegistryAdapter(
        address _metaverseRegistry,
        address _adapter
    ) external;

    function setMetaverseAdministrativeOperator(
        address _metaverseRegistry,
        address _administrativeOperator
    ) external;

    function rentWithOperator(
        uint256 _assetId,
        uint256 _period,
        address _operator,
        address _paymentToken,
        uint256 _amount
    ) external payable;

    function updateRentOperator(
        uint256 _assetId,
        uint256 _rentId,
        address _newOperator
    ) external;

    function updateAdapterForRent(uint256 _assetId, uint256 _rentId) external;

    function updateAdapterWithAdministrativeOperator(uint256 _assetId) external;

    function rentOperator(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);

    function metaverseRegistryAdministrativeOperator(address _metaverseRegistry)
        external
        view
        returns (address);

    function metaverseRegistryAdapter(address _metaverseRegistry)
        external
        view
        returns (address);
}
