// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../adapters/ConsumableAdapterV1.sol";
import "../interfaces/IMetaverseAdditionFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibMetaverseConsumableAdapter.sol";
import "../libraries/marketplace/LibMarketplace.sol";

contract MetaverseAdditionFacet is IMetaverseAdditionFacet {
    /// @notice Adds a Metaverse to LandWorks.
    /// @param _metaverseId The id of the metaverse
    /// @param _name Name of the metaverse
    /// @param _metaverseRegistries A list of metaverse registries, that will be
    /// associated with the given metaverse id.
    /// @param _administrativeConsumers A list of administrative consumers, mapped
    /// 1:1 to its metaverse registry index. Used as a consumer when no active rents are
    /// active.
    function addMetaverse(
        uint256 _metaverseId,
        string calldata _name,
        address[] calldata _metaverseRegistries,
        address[] calldata _administrativeConsumers
    ) public {
        require(
            _metaverseRegistries.length == _administrativeConsumers.length,
            "invalid metaverse registries and operators length"
        );
        LibOwnership.enforceIsContractOwner();

        LibMarketplace.setMetaverseName(_metaverseId, _name);
        emit SetMetaverseName(_metaverseId, _name);

        for (uint256 i = 0; i < _metaverseRegistries.length; i++) {
            address metaverseRegistry = _metaverseRegistries[i];
            address administrativeConsumer = _administrativeConsumers[i];

            require(
                metaverseRegistry != address(0),
                "_metaverseRegistry must not be 0x0"
            );
            LibMarketplace.setRegistry(_metaverseId, metaverseRegistry, true);
            emit SetRegistry(_metaverseId, metaverseRegistry, true);

            address adapter = address(
                new ConsumableAdapterV1(address(this), metaverseRegistry)
            );

            LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage()
                .consumableAdapters[metaverseRegistry] = adapter;
            emit ConsumableAdapterUpdated(metaverseRegistry, adapter);

            LibMetaverseConsumableAdapter
                .metaverseConsumableAdapterStorage()
                .administrativeConsumers[
                    metaverseRegistry
                ] = administrativeConsumer;

            emit AdministrativeConsumerUpdated(
                metaverseRegistry,
                administrativeConsumer
            );
        }
    }
}
