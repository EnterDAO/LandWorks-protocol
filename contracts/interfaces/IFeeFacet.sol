// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFeeFacet {
    event ClaimProtocolFee(address _token, address _recipient, uint256 _amount);
    event ClaimRentFee(
        uint256 _assetId,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetFee(address _token, uint256 _fee);
    event SetTokenPayment(address _token, bool _status);

    function claimRentFee(uint256 _assetId) external;

    function claimMultipleRentFees(uint256[] calldata _assetIds) external;

    function claimProtocolFee(address _token) external;

    function claimProtocolFees(address[] calldata _tokens) external;

    function setFee(address _token, uint256 _feePercentage) external;

    function setTokenPayment(
        address _token,
        uint256 _feePercentage,
        bool _status
    ) external;

    function protocolFeeFor(address _token) external view returns (uint256);

    function assetRentFeesFor(uint256 _assetId, address _token)
        external
        view
        returns (uint256);

    function supportsTokenPayment(address _token) external view returns (bool);

    function totalTokenPayments() external view returns (uint256);

    function tokenPaymentAt(uint256 _index) external view returns (address);

    function feePercentage(address _token) external view returns (uint256);

    function feePrecision() external pure returns (uint256);
}
