// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../adapters/IAdapterV1.sol";
import "../interfaces/IMetaverseAdapterFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibAssetRentOperator.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../libraries/marketplace/LibMetaverseRegistryAdapter.sol";
import "../libraries/marketplace/LibRent.sol";

contract MetaverseAdapterFacet is IMetaverseAdapterFacet {
    function setMetaverseRegistryAdapter(
        address _metaverseRegistry,
        address _adapter
    ) public {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry must not be 0x0"
        );
        require(_adapter != address(0), "_adapter must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibMetaverseRegistryAdapter
            .metaverseRegistryAdapterStorage()
            .metaverseRegistryAdapters[_metaverseRegistry] = _adapter;

        emit MetaverseRegistryAdapterUpdated(_metaverseRegistry, _adapter);
    }

    function setMetaverseAdministrativeOperator(
        address _metaverseRegistry,
        address _administrativeOperator
    ) public {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry must not be 0x0"
        );
        require(
            _administrativeOperator != address(0),
            "_administrativeOperator must not be 0x0"
        );
        LibOwnership.enforceIsContractOwner();

        LibAssetRentOperator.assetRentOperatorStorage().administrativeOperators[
                _metaverseRegistry
            ] = _administrativeOperator;

        emit MetaverseRegistryAdministrativeOperatorUpdated(
            _metaverseRegistry,
            _administrativeOperator
        );
    }

    function rentWithOperator(
        uint256 _assetId,
        uint256 _period,
        address _operator,
        address _paymentToken,
        uint256 _amount
    ) public payable {
        require(_operator != address(0), "_operator must not be 0x0");

        (uint256 rentId, bool rentStartsNow) = LibRent.rent(
            LibRent.RentParams({
                _assetId: _assetId,
                _period: _period,
                _paymentToken: _paymentToken,
                _amount: _amount
            })
        );

        LibAssetRentOperator.assetRentOperatorStorage().operators[_assetId][
                rentId
            ] = _operator;

        emit UpdateRentOperator(_assetId, rentId, _operator);

        if (rentStartsNow) {
            updateAdapterOperator(_assetId, rentId, _operator);
        }
    }

    /// @notice Updates the operator for the given rent of an asset
    /// @param _assetId The target asset
    /// @param _rentId The target rent for the asset
    /// @param _newOperator The to-be-set new operator
    function updateRentOperator(
        uint256 _assetId,
        uint256 _rentId,
        address _newOperator
    ) public {
        require(_newOperator != address(0), "_newOperator must not be 0x0");
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(LibERC721.exists(_assetId), "_assetId not found");

        require(
            msg.sender == ms.rents[_assetId][_rentId].renter,
            "caller is not renter"
        );
        LibAssetRentOperator.assetRentOperatorStorage().operators[_assetId][
                _rentId
            ] = _newOperator;

        emit UpdateRentOperator(_assetId, _rentId, _newOperator);
    }

    function updateAdapterForRent(uint256 _assetId, uint256 _rentId) public {
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
        address operator = LibAssetRentOperator
            .assetRentOperatorStorage()
            .operators[_assetId][_rentId];

        updateAdapterOperator(_assetId, _rentId, operator);
    }

    function updateAdapterWithAdministrativeOperator(uint256 _assetId) public {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(LibERC721.exists(_assetId), "_assetId not found");
        LibMarketplace.Asset memory asset = ms.assets[_assetId];

        require(
            block.timestamp > ms.rents[_assetId][asset.totalRents].end,
            "_assetId has an active rent"
        );

        address operator = LibAssetRentOperator
            .assetRentOperatorStorage()
            .administrativeOperators[asset.metaverseRegistry];

        address adapter = LibMetaverseRegistryAdapter
            .metaverseRegistryAdapterStorage()
            .metaverseRegistryAdapters[asset.metaverseRegistry];

        IAdapterV1(adapter).setOperator(asset.metaverseAssetId, operator);

        emit UpdateAdapterAdministrativeOperator(_assetId, adapter, operator);
    }

    function updateAdapterOperator(
        uint256 _assetId,
        uint256 _rentId,
        address _operator
    ) internal {
        LibMarketplace.Asset memory asset = LibMarketplace
            .marketplaceStorage()
            .assets[_assetId];
        address adapter = LibMetaverseRegistryAdapter
            .metaverseRegistryAdapterStorage()
            .metaverseRegistryAdapters[asset.metaverseRegistry];

        IAdapterV1(adapter).setOperator(asset.metaverseAssetId, _operator);

        emit UpdateAdapterOperator(_assetId, _rentId, adapter, _operator);
    }

    function rentOperator(uint256 _assetId, uint256 _rentId)
        public
        view
        returns (address)
    {
        return
            LibAssetRentOperator.assetRentOperatorStorage().operators[_assetId][
                _rentId
            ];
    }

    function metaverseRegistryAdministrativeOperator(address _metaverseRegistry)
        public
        view
        returns (address)
    {
        return
            LibAssetRentOperator
                .assetRentOperatorStorage()
                .administrativeOperators[_metaverseRegistry];
    }

    function metaverseRegistryAdapter(address _metaverseRegistry)
        public
        view
        returns (address)
    {
        return
            LibMetaverseRegistryAdapter
                .metaverseRegistryAdapterStorage()
                .metaverseRegistryAdapters[_metaverseRegistry];
    }
}
