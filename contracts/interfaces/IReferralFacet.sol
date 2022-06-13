// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IReferralFacet {
    event SetReferralAdapter(address indexed _referralAdapter);
    event ClaimReferralFee(
        address indexed _claimer,
        address indexed _token,
        uint256 _amount
    );

    function setReferralAdapter(address _referralAdapter) external;

    function claimReferralFee(address _token)
        external
        returns (address token_, uint256 amount_);

    function claimMultipleReferralFees(address[] memory _tokens) external;

    function referralFee(address _referrer, address _token)
        external
        view
        returns (uint256 amount_);
}
