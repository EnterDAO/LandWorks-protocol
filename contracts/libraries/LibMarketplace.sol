// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibMarketplace {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant MARKETPLACE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.marketplace");

    enum AssetStatus {
        Listed,
        Delisted
    }

    struct Asset {
        uint256 metaverseId;
        address metaverseRegistry;
        uint256 metaverseAssetId;
        address paymentToken;
        uint256 minPeriod;
        uint256 maxPeriod;
        uint256 maxFutureBlock;
        uint256 pricePerBlock;
        uint256 totalRents;
        AssetStatus status;
    }

    struct Rent {
        address renter;
        uint256 startBlock;
        uint256 endBlock;
    }

    struct MetaverseRegistry {
        // Name of the Metaverse
        string name;
        // Supported registries
        EnumerableSet.AddressSet registries;
    }

    struct MarketplaceStorage {
        // Supported metaverse registries
        mapping(uint256 => MetaverseRegistry) metaverseRegistries;
        // Assets
        mapping(uint256 => Asset) assets;
        // Rents
        mapping(uint256 => mapping(uint256 => Rent)) rents;
    }

    function marketplaceStorage()
        internal
        pure
        returns (MarketplaceStorage storage ms)
    {
        bytes32 position = MARKETPLACE_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }

    function setMetaverseName(uint256 _metaverseId, string memory _name)
        internal
    {
        marketplaceStorage().metaverseRegistries[_metaverseId].name = _name;
    }

    function metaverseName(uint256 _metaverseId)
        internal
        view
        returns (string memory)
    {
        return marketplaceStorage().metaverseRegistries[_metaverseId].name;
    }

    function setRegistry(
        uint256 _metaverseId,
        address _registry,
        bool _status
    ) internal {
        LibMarketplace.MetaverseRegistry storage mr = marketplaceStorage()
            .metaverseRegistries[_metaverseId];
        if (_status) {
            require(mr.registries.add(_registry), "_registry already added");
        } else {
            require(mr.registries.remove(_registry), "_registry not found");
        }
    }

    function supportsRegistry(uint256 _metaverseId, address _registry)
        internal
        view
        returns (bool)
    {
        return
            marketplaceStorage()
                .metaverseRegistries[_metaverseId]
                .registries
                .contains(_registry);
    }

    function totalRegistries(uint256 _metaverseId)
        internal
        view
        returns (uint256)
    {
        return
            marketplaceStorage()
                .metaverseRegistries[_metaverseId]
                .registries
                .length();
    }

    function registryAt(uint256 _metaverseId, uint256 _index)
        internal
        view
        returns (address)
    {
        return
            marketplaceStorage()
                .metaverseRegistries[_metaverseId]
                .registries
                .at(_index);
    }

    function addRent(
        uint256 _eNft,
        address _renter,
        uint256 _startBlock,
        uint256 _endBlock
    ) internal returns (uint256) {
        LibMarketplace.MarketplaceStorage storage ms = marketplaceStorage();
        uint256 newRentId = ms.assets[_eNft].totalRents + 1;

        ms.assets[_eNft].totalRents = newRentId;
        ms.rents[_eNft][ms.assets[_eNft].totalRents] = LibMarketplace.Rent({
            renter: _renter,
            startBlock: _startBlock,
            endBlock: _endBlock
        });

        return newRentId;
    }

    function assetAt(uint256 _eNft) internal view returns (Asset memory) {
        return marketplaceStorage().assets[_eNft];
    }

    function rentAt(uint256 _eNft, uint256 _rentId)
        internal
        view
        returns (Rent memory)
    {
        return marketplaceStorage().rents[_eNft][_rentId];
    }
}
