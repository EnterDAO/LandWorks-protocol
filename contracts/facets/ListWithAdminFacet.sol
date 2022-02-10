// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../adapters/IConsumableAdapterV1.sol";
import "../interfaces/decentraland/IDecentralandRegistry.sol";
import "../interfaces/IListWithAdminFacet.sol";
import "../libraries/LibFee.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibDecentraland.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../libraries/marketplace/LibMetaverseConsumableAdapter.sol";
import "../libraries/marketplace/LibRent.sol";

contract ListWithAdminFacet is IListWithAdminFacet {
    // @notice Provides asset of the given metaverse registry for rental.
    /// Transfers and locks the provided metaverse asset to the contract.
    /// Mints an asset, representing the locked asset.
    /// Sets the administrative consumer as consumer in the metaverse consumable adapter.
    /// @param _metaverseId The id of the metaverse
    /// @param _metaverseRegistry The registry of the metaverse
    /// @param _metaverseAssetId The id from the metaverse registry
    /// @param _minPeriod The minimum number of time (in seconds) the asset can be rented
    /// @param _maxPeriod The maximum number of time (in seconds) the asset can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the asset to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0000000000000000000000000000000000000001 for ETH.
    /// @param _pricePerSecond The price for rental per second
    function listWithAdministrativeConsumer(
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    ) external returns (uint256) {
        uint256 assetId = list(
            _metaverseId,
            _metaverseRegistry,
            _metaverseAssetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureTime,
            _paymentToken,
            _pricePerSecond
        );
        LibMetaverseConsumableAdapter.MetaverseConsumableAdapterStorage
            storage mcas = LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage();

        address consumer = mcas.administrativeConsumers[_metaverseRegistry];

        address adapter = mcas.consumableAdapters[_metaverseRegistry];

        IConsumableAdapterV1(adapter).setConsumer(_metaverseAssetId, consumer);

        emit UpdateAdapterAdministrativeConsumer(assetId, adapter, consumer);

        return assetId;
    }

    // @notice Provides asset of the given metaverse registry for rental.
    /// Transfers and locks the provided metaverse asset to the contract.
    /// Mints an asset, representing the locked asset.
    /// Sets the administrative operator as operator in the metaverse registry.
    /// @param _metaverseId The id of the metaverse
    /// @param _metaverseRegistry The registry of the metaverse
    /// @param _metaverseAssetId The id from the metaverse registry
    /// @param _minPeriod The minimum number of time (in seconds) the asset can be rented
    /// @param _maxPeriod The maximum number of time (in seconds) the asset can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the asset to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0000000000000000000000000000000000000001 for ETH.
    /// @param _pricePerSecond The price for rental per second
    function listDecentralandWithAdministrativeOperator(
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    ) external returns (uint256) {
        uint256 assetId = list(
            _metaverseId,
            _metaverseRegistry,
            _metaverseAssetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureTime,
            _paymentToken,
            _pricePerSecond
        );

        address operator = LibDecentraland
            .decentralandStorage()
            .administrativeOperator;
        IDecentralandRegistry(_metaverseRegistry).setUpdateOperator(
            _metaverseAssetId,
            operator
        );

        emit UpdateAdministrativeState(assetId, operator);

        return assetId;
    }

    function list(
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    ) internal returns (uint256 assetId) {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry must not be 0x0"
        );
        require(
            LibMarketplace.supportsRegistry(_metaverseId, _metaverseRegistry),
            "_registry not supported"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureTime,
            "_maxPeriod more than _maxFutureTime"
        );
        require(
            LibFee.supportsTokenPayment(_paymentToken),
            "payment type not supported"
        );

        uint256 asset = LibERC721.safeMint(msg.sender);

        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        ms.assets[asset] = LibMarketplace.Asset({
            metaverseId: _metaverseId,
            metaverseRegistry: _metaverseRegistry,
            metaverseAssetId: _metaverseAssetId,
            paymentToken: _paymentToken,
            minPeriod: _minPeriod,
            maxPeriod: _maxPeriod,
            maxFutureTime: _maxFutureTime,
            pricePerSecond: _pricePerSecond,
            status: LibMarketplace.AssetStatus.Listed,
            totalRents: 0
        });

        LibTransfer.erc721SafeTransferFrom(
            _metaverseRegistry,
            msg.sender,
            address(this),
            _metaverseAssetId
        );

        emit List(
            asset,
            _metaverseId,
            _metaverseRegistry,
            _metaverseAssetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureTime,
            _paymentToken,
            _pricePerSecond
        );
        return asset;
    }
}
