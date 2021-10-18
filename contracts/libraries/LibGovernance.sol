// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibGovernance {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant GOVERNANCE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.governance");

    struct GovernanceStorage {
        // Supported land registries of metaverses
        EnumerableSet.AddressSet registries;
        // Supported tokens as a form of payment
        EnumerableSet.AddressSet tokenPayments;
    }

    function governanceStorage()
        internal
        pure
        returns (GovernanceStorage storage gs)
    {
        bytes32 position = GOVERNANCE_STORAGE_POSITION;

        assembly {
            gs.slot := position
        }
    }

    function setRegistry(address _registry, bool _status) internal {
        GovernanceStorage storage gs = governanceStorage();
        if (_status) {
            require(gs.registries.add(_registry), "_registry already added");
        } else {
            require(gs.registries.remove(_registry), "_registry not found");
        }
    }

    function setTokenPayment(address _token, bool _status) internal {
        GovernanceStorage storage gs = governanceStorage();
        if (_status) {
            require(gs.tokenPayments.add(_token), "_token already added");
        } else {
            require(gs.tokenPayments.remove(_token), "_token not found");
        }
    }

    function supportsRegistry(address _registry) internal view returns (bool) {
        return governanceStorage().registries.contains(_registry);
    }

    function supportsTokenPayment(address _token) internal view returns (bool) {
        return governanceStorage().tokenPayments.contains(_token);
    }

    function totalRegistries() internal view returns (uint256) {
        return governanceStorage().registries.length();
    }

    function totalTokenPayments() internal view returns (uint256) {
        return governanceStorage().tokenPayments.length();
    }

    function registryAt(uint256 _index) internal view returns (address) {
        return governanceStorage().registries.at(_index);
    }

    function tokenPaymentAt(uint256 _index) internal view returns (address) {
        return governanceStorage().tokenPayments.at(_index);
    }
}
