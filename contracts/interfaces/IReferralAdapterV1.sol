// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IReferralAdapterV1 {
    function referralPercentage(address _referral)
        external
        view
        returns (uint256 _mainPercentage, uint256 _userPercentage);

    function metaverseRegistryReferral(address _metaverseRegistry)
        external
        view
        returns (address _referral, uint256 _referralPercentage);
}
