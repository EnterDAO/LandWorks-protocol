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

    struct MarketplaceStorage {
        bool initialized;
        // Address of the LandWorks NFT
        address landWorksNft;
        // Supported land registries of metaverses
        EnumerableSet.AddressSet registries;
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

    function setRegistry(address _registry, bool _status) internal {
        LibMarketplace.MarketplaceStorage storage ms = marketplaceStorage();
        if (_status) {
            require(ms.registries.add(_registry), "_registry already added");
        } else {
            require(ms.registries.remove(_registry), "_registry not found");
        }
    }

    function supportsRegistry(address _registry) internal view returns (bool) {
        return marketplaceStorage().registries.contains(_registry);
    }

    function totalRegistries() internal view returns (uint256) {
        return marketplaceStorage().registries.length();
    }

    function registryAt(uint256 _index) internal view returns (address) {
        return marketplaceStorage().registries.at(_index);
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

    function landWorksNft() internal view returns (address) {
        return marketplaceStorage().landWorksNft;
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
