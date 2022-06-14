// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/LibReferral.sol";

interface IReferralFacet {
    event ClaimReferralFee(
        address indexed _claimer,
        address indexed _token,
        uint256 _amount
    );

    function claimReferralFee(address _token)
        external
        returns (address token_, uint256 amount_);

    function claimMultipleReferralFees(address[] memory _tokens) external;

    function referralFee(address _referrer, address _token)
        external
        view
        returns (uint256 amount_);

    function metaverseRegistryReferral(address _metaverseRegistry)
        external
        view
        returns (LibReferral.MetaverseRegistryReferral memory);

    function referralPercentage(address _referral)
        external
        view
        returns (LibReferral.ReferralPercentage memory);
}
