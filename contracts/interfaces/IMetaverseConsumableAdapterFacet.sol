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

    /// @notice Sets the Metaverse consumable adapter
    /// @param _metaverse The target metaverse
    /// @param _consumableAdapter The address of the consumable adapter
    function setMetaverseConsumableAdapter(
        address _metaverse,
        address _consumableAdapter
    ) external;

    /// @notice Sets the Metaverse administrative consumer, used
    /// as a consumer when LandWorks NFTs do not have an active rent.
    /// @param _metaverse The target metaverse
    /// @param _administrativeConsumer The target administrative consumer
    function setAdministrativeConsumerFor(
        address _metaverse,
        address _administrativeConsumer
    ) external;

    /// @notice Rents an asset, which metaverse has a consumable adapter.
    /// @dev If there are no active rents, this rent will begin, which will set
    /// the consumer directly in the Metaverse Consumable Adapter.
    /// If there are any active or upcoming rents, when this rent's time comes,
    /// {IMetaverseConsumableAdapterFacet-updateAdapterState} must be called
    /// in order to set the consumer in the Metaverse Consumable adapter.
    /// @param _assetId The target asset
    /// @param _period The target period of the rental
    /// @param _consumer The target consumer, which will be set as consumer in the
    /// consumable adapter once the rent is active
    /// @param _paymentToken The current payment token for the asset
    /// @param _amount The target amoun to be paid for the rent
    function rentWithConsumer(
        uint256 _assetId,
        uint256 _period,
        address _consumer,
        address _paymentToken,
        uint256 _amount
    ) external payable;

    /// @notice Updates the consumer for the given rent of an asset
    /// @dev If the current rent is active, after you update the consumer,
    /// you will need to update the consumer in the Metaverse Adapter as well.
    /// @param _assetId The target asset
    /// @param _rentId The target rent for the asset
    /// @param _newConsumer The to-be-set new consumer
    function updateConsumer(
        uint256 _assetId,
        uint256 _rentId,
        address _newConsumer
    ) external;

    /// @notice Updates the consumer for the given asset in the Metaverse Adapter with rent's provided consumer.
    /// When the rent becomes active (the current block.timestamp is between the rent's start and end),
    /// this function should be executed to set the provided rent consumer to the Metaverse Consumable Adapter.
    /// @param _assetId The target asset which will map to its corresponding Metaverse tokenId
    /// @param _rentId The target rent
    function updateAdapterState(uint256 _assetId, uint256 _rentId) external;

    /// @notice Updates the asset's metaverse tokenId with the administrative consumer in the Metaverse Adapter
    /// @dev This can be done only when the asset has no active rents.
    /// @param _assetId The target asset which will map to its corresponding Metaverse tokenId
    function updateAdapterAdministrativeState(uint256 _assetId) external;

    /// @notice Gets the consumer of the rent for the asset
    /// @param _assetId The target asset
    /// @param _rentId The target rent
    function rentConsumer(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (address);

    /// @notice Gets the administrative consumer of a metaverse
    /// @param _metaverse The target metaverse
    function metaverseAdministrativeConsumer(address _metaverse)
        external
        view
        returns (address);

    /// @notice Gets the consumable adapter of a metaverse
    /// @param _metaverse The target metaverse
    function metaverseConsumableAdapter(address _metaverse)
        external
        view
        returns (address);
}
