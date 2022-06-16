// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/LibReferral.sol";

interface IReferralFacet {
    event ClaimReferralFee(
        address indexed _claimer,
        address indexed _token,
        uint256 _amount
    );

    event SetReferralAdmin(address indexed _admin);

    event SetReferral(
        address indexed referral,
        uint16 percentage,
        uint16 userPercentage
    );
    event SetMetaverseRegistryReferal(
        address indexed metaverseRegistry,
        address indexed referal,
        uint16 percentage
    );

    function setReferralAdmin(address _admin) external;

    function setReferrals(
        address[] memory _referrals,
        uint16[] memory _percentages,
        uint16[] memory _userPercentages
    ) external;

    function setMetaverseRegistryReferral(
        address[] memory _metaverseRegistries,
        address[] memory _referrals,
        uint16[] memory _percentages
    ) external;

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
