// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library LibMetaverseRegistryAdapter {
    bytes32 constant METAVERSE_REGISTRY_ADAPTER_POSITION =
        keccak256("com.enterdao.landworks.metaverse.registry.adapter");

    struct MetaverseRegistryAdapterStorage {
        mapping(address => address) metaverseRegistryAdapters;
    }

    function metaverseRegistryAdapterStorage()
        internal
        pure
        returns (MetaverseRegistryAdapterStorage storage mras)
    {
        bytes32 position = METAVERSE_REGISTRY_ADAPTER_POSITION;

        assembly {
            mras.slot := position
        }
    }
}
