// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IGovernanceFacet {
    event SetRegistry(address _registry, bool _status);
    event SetTokenPayment(address _token, bool _status);

    function setRegistry(address _registry, bool _status) external;

    function setTokenPayment(address _token, bool _status) external;

    function supportsRegistry(address _registry) external view returns (bool);

    function supportsTokenPayment(address _token) external view returns (bool);

    function totalRegistries() external view returns (uint256);

    function totalTokenPayments() external view returns (uint256);

    function registryAt(uint256 _index) external view returns (address);

    function tokenPaymentAt(uint256 _index) external view returns (address);
}
