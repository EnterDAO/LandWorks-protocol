// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IGovernanceFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibGovernance.sol";

contract GovernanceFacet is IGovernanceFacet {
    function setRegistry(address _registry, bool _status) external {
        require(_registry != address(0), "_registy must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibGovernance.setRegistry(_registry, _status);

        emit SetRegistry(_registry, _status);
    }

    function setTokenPayment(address _token, bool _status) external {
        require(_token != address(0), "_token must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibGovernance.setTokenPayment(_token, _status);

        emit SetTokenPayment(_token, _status);
    }

    function supportsRegistry(address _registry) external view returns (bool) {
        return LibGovernance.supportsRegistry(_registry);
    }

    function supportsTokenPayment(address _token) external view returns (bool) {
        return LibGovernance.supportsTokenPayment(_token);
    }

    function totalRegistries() external view returns (uint256) {
        return LibGovernance.totalRegistries();
    }

    function totalTokenPayments() external view returns (uint256) {
        return LibGovernance.totalTokenPayments();
    }

    function registryAt(uint256 _index) external view returns (address) {
        return LibGovernance.registryAt(_index);
    }

    function tokenPaymentAt(uint256 _index) external view returns (address) {
        return LibGovernance.tokenPaymentAt(_index);
    }
}
