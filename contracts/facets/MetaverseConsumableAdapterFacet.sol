// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../adapters/IConsumableAdapterV1.sol";
import "../interfaces/IMetaverseConsumableAdapterFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibMetaverseConsumableAdapter.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../libraries/marketplace/LibRent.sol";

/// @notice A Metaverse related facet, that manages the logic
/// with metaverses having an external consumable adapter, used
/// to store consumers of LandWorks NFTs upon rentals.
contract MetaverseConsumableAdapterFacet is IMetaverseConsumableAdapterFacet {
    /// @notice Sets the Metaverse consumable adapter
    /// @param _metaverse The target metaverse
    /// @param _consumableAdapter The address of the consumable adapter
    function setMetaverseConsumableAdapter(
        address _metaverse,
        address _consumableAdapter
    ) public {
        require(_metaverse != address(0), "_metaverse must not be 0x0");
        require(
            _consumableAdapter != address(0),
            "_consumableAdapter must not be 0x0"
        );
        LibOwnership.enforceIsContractOwner();

        LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .metaverseConsumableAdapters[_metaverse] = _consumableAdapter;

        emit MetaverseConsumableAdapterUpdated(_metaverse, _consumableAdapter);
    }

    /// @notice Sets the metaverse administrative consumer, used
    /// as a consumer when LandWorks NFTs do not have an active rent.
    /// @param _metaverse The target metaverse
    /// @param _administrativeConsumer The target administrative consumer
    function setAdministrativeConsumerFor(
        address _metaverse,
        address _administrativeConsumer
    ) public {
        require(_metaverse != address(0), "_metaverse must not be 0x0");
        require(
            _administrativeConsumer != address(0),
            "_administrativeConsumer must not be 0x0"
        );
        LibOwnership.enforceIsContractOwner();

        LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .administrativeConsumers[_metaverse] = _administrativeConsumer;

        emit MetaverseAdministrativeConsumerUpdated(
            _metaverse,
            _administrativeConsumer
        );
    }

    /// @notice Rents an asset, providing a consumer that will consume the asset
    /// during its rental period.
    /// @dev The asset's metaverse must have previously set a metaverse consumable adapter.
    /// @dev If there are no active rents, this rent will begin, which will set
    /// the consumer directly in the metaverse consumable adapter.
    /// If there are any active or upcoming rents, when this rent's time comes,
    /// {IMetaverseConsumableAdapterFacet-updateAdapterState} must be called
    /// in order to set the consumer in the metaverse consumable adapter.
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
    ) public payable {
        require(_consumer != address(0), "_consumer must not be 0x0");

        (uint256 rentId, bool rentStartsNow) = LibRent.rent(
            LibRent.RentParams({
                _assetId: _assetId,
                _period: _period,
                _paymentToken: _paymentToken,
                _amount: _amount
            })
        );

        LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .consumers[_assetId][rentId] = _consumer;

        emit UpdateRentConsumer(_assetId, rentId, _consumer);

        if (rentStartsNow) {
            updateAdapterConsumer(_assetId, rentId, _consumer);
        }
    }

    /// @notice Updates the consumer for the given rent of an asset
    /// @dev If the current rent is active, after you update the consumer,
    /// you will need to update the consumer in the metaverse consumable adapter as well.
    /// @param _assetId The target asset
    /// @param _rentId The target rent for the asset
    /// @param _newConsumer The to-be-set new consumer
    function updateConsumer(
        uint256 _assetId,
        uint256 _rentId,
        address _newConsumer
    ) public {
        require(_newConsumer != address(0), "_newConsumer must not be 0x0");
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(LibERC721.exists(_assetId), "_assetId not found");

        require(
            msg.sender == ms.rents[_assetId][_rentId].renter,
            "caller is not renter"
        );
        LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .consumers[_assetId][_rentId] = _newConsumer;

        emit UpdateRentConsumer(_assetId, _rentId, _newConsumer);
    }

    /// @notice Updates the consumer for the given asset in the metaverse consumable adapter with rent's provided consumer.
    /// When the rent becomes active (the current block.timestamp is between the rent's start and end),
    /// this function should be executed to set the provided rent consumer to the metaverse consumable adapter.
    /// @param _assetId The target asset which will map to its corresponding metaverse tokenId
    /// @param _rentId The target rent
    function updateAdapterState(uint256 _assetId, uint256 _rentId) public {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(LibERC721.exists(_assetId), "_assetId not found");
        LibMarketplace.Rent memory rent = ms.rents[_assetId][_rentId];

        require(
            block.timestamp >= rent.start,
            "block timestamp less than rent start"
        );
        require(
            block.timestamp < rent.end,
            "block timestamp more than or equal to rent end"
        );
        address consumer = LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .consumers[_assetId][_rentId];

        updateAdapterConsumer(_assetId, _rentId, consumer);
    }

    /// @notice Updates the asset's metaverse tokenId with the administrative consumer in the metaverse consumable adapter
    /// @dev This can be done only when the asset has no active rents.
    /// @param _assetId The target asset which will map to its corresponding metaverse tokenId
    function updateAdapterAdministrativeState(uint256 _assetId) public {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(LibERC721.exists(_assetId), "_assetId not found");
        LibMarketplace.Asset memory asset = ms.assets[_assetId];

        require(
            block.timestamp > ms.rents[_assetId][asset.totalRents].end,
            "_assetId has an active rent"
        );
        LibMetaverseConsumableAdapter.MetaverseConsumableAdapterStorage
            storage mcas = LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage();

        address consumer = mcas.administrativeConsumers[
            asset.metaverseRegistry
        ];

        address consumableAdapter = mcas.metaverseConsumableAdapters[
            asset.metaverseRegistry
        ];

        IConsumableAdapterV1(consumableAdapter).setConsumer(
            asset.metaverseAssetId,
            consumer
        );

        emit UpdateAdapterAdministrativeConsumer(
            _assetId,
            consumableAdapter,
            consumer
        );
    }

    /// @dev Updates the metaverse consumable adapter for the asset's metaverse tokenId
    /// with the provided consumer
    /// @param _assetId The target asset
    /// @param _rentId The target rent. Used only for event emission.
    /// @param _consumer The rent's consumer
    function updateAdapterConsumer(
        uint256 _assetId,
        uint256 _rentId,
        address _consumer
    ) internal {
        LibMarketplace.Asset memory asset = LibMarketplace
            .marketplaceStorage()
            .assets[_assetId];
        address consumableAdapter = LibMetaverseConsumableAdapter
            .metaverseConsumableAdapterStorage()
            .metaverseConsumableAdapters[asset.metaverseRegistry];

        IConsumableAdapterV1(consumableAdapter).setConsumer(
            asset.metaverseAssetId,
            _consumer
        );

        emit UpdateAdapterConsumer(
            _assetId,
            _rentId,
            consumableAdapter,
            _consumer
        );
    }

    /// @notice Gets the consumer of the rent for the asset
    /// @param _assetId The target asset
    /// @param _rentId The target rent
    function rentConsumer(uint256 _assetId, uint256 _rentId)
        public
        view
        returns (address)
    {
        return
            LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage()
                .consumers[_assetId][_rentId];
    }

    /// @notice Gets the administrative consumer of a metaverse
    /// @param _metaverse The target metaverse
    function metaverseAdministrativeConsumer(address _metaverse)
        public
        view
        returns (address)
    {
        return
            LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage()
                .administrativeConsumers[_metaverse];
    }

    /// @notice Gets the consumable adapter of a metaverse
    /// @param _metaverse The target metaverse
    function metaverseConsumableAdapter(address _metaverse)
        public
        view
        returns (address)
    {
        return
            LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage()
                .metaverseConsumableAdapters[_metaverse];
    }
}
