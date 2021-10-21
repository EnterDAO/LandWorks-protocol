// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IGovernanceFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibGovernance.sol";

contract GovernanceFacet is IGovernanceFacet {
    /// @notice Sets Metaverse registry to the contract
    /// @param _registry The registry to be set
    /// @param _status Whether the registry will be added/removed
    function setRegistry(address _registry, bool _status) external {
        require(_registry != address(0), "_registy must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibGovernance.setRegistry(_registry, _status);

        emit SetRegistry(_registry, _status);
    }

    /// @notice Sets status of token payment (accepted or not)
    /// @param _token The target token
    /// @param _status Whether the token will be approved or not
    function setTokenPayment(address _token, bool _status) external {
        require(_token != address(0), "_token must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibGovernance.setTokenPayment(_token, _status);

        emit SetTokenPayment(_token, _status);
    }

    /// @notice Get whether the metaverse registry is supported
    /// @param _registry The target registry
    function supportsRegistry(address _registry) external view returns (bool) {
        return LibGovernance.supportsRegistry(_registry);
    }

    /// @notice Gets whether the token payment is supported
    /// @param _token The target token
    function supportsTokenPayment(address _token) external view returns (bool) {
        return LibGovernance.supportsTokenPayment(_token);
    }

    /// @notice Gets the total amount of metaverse registries
    function totalRegistries() external view returns (uint256) {
        return LibGovernance.totalRegistries();
    }

    /// @notice Gets the total amount of token payments
    function totalTokenPayments() external view returns (uint256) {
        return LibGovernance.totalTokenPayments();
    }

    /// @notice Gets the metaverse registry at a given index
    function registryAt(uint256 _index) external view returns (address) {
        return LibGovernance.registryAt(_index);
    }

    /// @notice Gets the token payment at a given index
    function tokenPaymentAt(uint256 _index) external view returns (address) {
        return LibGovernance.tokenPaymentAt(_index);
    }
}
