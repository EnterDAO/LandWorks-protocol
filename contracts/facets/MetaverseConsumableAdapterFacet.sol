// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../adapters/IConsumableAdapterV1.sol";
import "../interfaces/IMetaverseConsumableAdapterFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibMetaverseConsumableAdapter.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../libraries/marketplace/LibRent.sol";

contract MetaverseConsumableAdapterFacet is IMetaverseConsumableAdapterFacet {
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
