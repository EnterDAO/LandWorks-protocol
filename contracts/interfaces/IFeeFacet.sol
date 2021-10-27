// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFeeFacet {
    event ClaimFee(address _token, address _recipient, uint256 _amount);
    event ClaimRentFee(
        uint256 _eNft,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetFee(address _token, uint256 _fee);
    event SetFeePrecision(address indexed _caller, uint256 _feePrecision);
    event SetTokenPayment(address _token, bool _status);

    function claimRentFee(uint256 _eNft) external;

    function claimProtocolFee(address _token) external;

    function setFee(address _token, uint256 _feePercentage) external;

    function setFeePrecision(uint256 _feePrecision) external;

    function setTokenPayment(
        address _token,
        uint256 _feePercentage,
        bool _status
    ) external;

    function supportsTokenPayment(address _token) external view returns (bool);

    function totalTokenPayments() external view returns (uint256);

    function tokenPaymentAt(uint256 _index) external view returns (address);

    function feePercentage(address _token) external view returns (uint256);

    function feePrecision() external view returns (uint256);
}
