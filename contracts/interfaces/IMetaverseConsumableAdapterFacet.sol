// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMetaverseConsumableAdapterFacet {
    event MetaverseConsumableAdapterUpdated(
        address indexed _metaverse,
        address indexed _adapter
    );

    event MetaverseAdministrativeConsumerUpdated(
        address indexed _metaverse,
        address indexed _administrativeConsumer
    );

    event UpdateRentConsumer(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _consumer
    );

    event UpdateAdapterConsumer(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _adapter,
        address indexed _consumer
    );

    event UpdateAdapterAdministrativeConsumer(
        uint256 indexed _assetId,
        address indexed _adapter,
        address indexed _consumer
    );

    function setMetaverseConsumableAdapter(address _metaverse, address _adapter)
        external;

    function setAdministrativeConsumerFor(
        address _metaverse,
        address _administrativeConsumer
    ) external;

    function rentWithConsumer(
        uint256 _assetId,
        uint256 _period,
        address _consumer,
        address _paymentToken,
        uint256 _amount
    ) external payable;

    function updateConsumer(
        uint256 _assetId,
        uint256 _rentId,
        address _newConsumer
    ) external;

    function updateAdapterState(uint256 _assetId, uint256 _rentId) external;

    function updateAdapterAdministrativeState(uint256 _assetId) external;

    function rentConsumer(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);

    function metaverseAdministrativeConsumer(address _metaverse)
        external
        view
        returns (address);

    function metaverseConsumableAdapter(address _metaverse)
        external
        view
        returns (address);
}
