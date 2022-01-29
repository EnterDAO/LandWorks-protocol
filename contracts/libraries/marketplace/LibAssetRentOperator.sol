// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibAssetRentOperator {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant ASSET_RENT_OPERATOR_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.marketplace.asset.rent.operator");

    struct AssetRentOperatorStorage {
        // Stores the operators for each asset's rentals
        mapping(uint256 => mapping(uint256 => address)) operators;
        // Stores the metaverse registry administrative operators
        mapping(address => address) administrativeOperators;
    }

    function assetRentOperatorStorage()
        internal
        pure
        returns (AssetRentOperatorStorage storage aros)
    {
        bytes32 position = ASSET_RENT_OPERATOR_STORAGE_POSITION;

        assembly {
            aros.slot := position
        }
    }
}
