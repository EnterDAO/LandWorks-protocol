// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IMetaverseAdapterFacet.sol";
import "../adapters/IAdapterV1.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibAssetRentOperator.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../libraries/marketplace/LibMetaverseRegistryAdapter.sol";
import "../libraries/marketplace/LibRent.sol";

contract MetaverseAdapterFacet is IMetaverseAdapterFacet {
    function setMetaverseRegistryAdapter(
        uint256 _metaverseId,
        address _metaverseRegistry,
        address _adapter
    ) public {
        require(_adapter != address(0), "_adapter must not be 0x0");
        require(
            LibMarketplace.supportsRegistry(_metaverseId, _metaverseRegistry),
            "_metaverseRegistry not supported"
        );
        LibOwnership.enforceIsContractOwner();

        LibMetaverseRegistryAdapter
            .metaverseRegistryAdapterStorage()
            .metaverseRegistryAdapters[_metaverseRegistry] = _adapter;

        emit MetaverseRegistryAdapterUpdated(_metaverseRegistry, _adapter);
    }

    function rentWithOperator(
        uint256 _assetId,
        uint256 _period,
        address _operator,
        address _paymentToken,
        uint256 _amount
    ) external payable {
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

        emit UpdateOperator(_assetId, rentId, _operator);

        if (rentStartsNow) {
            updateAdapterOperator(_assetId, rentId, _operator);
        }
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
        external
        view
        returns (address)
    {
        return
            LibAssetRentOperator.assetRentOperatorStorage().operators[_assetId][
                _rentId
            ];
    }
}
