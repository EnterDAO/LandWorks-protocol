// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IGovernanceFacet {
    event SetRegistry(address _registry, bool _status);
    event SetTokenPayment(address _token, bool _status);

    function setRegistry(address _registry, bool _status) external;

    function setTokenPayment(address _token, bool _status) external;
}
