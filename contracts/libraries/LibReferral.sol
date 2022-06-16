// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

library LibReferral {
    bytes32 constant REFERRAL_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.referral");

    struct MetaverseRegistryReferral {
        address referral;
        uint16 percentage;
    }
    struct ReferralPercentage {
        // Referral percentage
        uint16 mainPercentage;
        // User percentage
        uint16 userPercentage;
    }

    event WhitelistedReferral(address indexed _referral, uint256 _percentage);

    struct ReferralStorage {
        address admin;
        // Stores addresses of listing referrals
        mapping(uint256 => address) listingReferrals;
        // Referral fees address => paymentToken => amount
        mapping(address => mapping(address => uint256)) referralFees;
        mapping(address => MetaverseRegistryReferral) metaverseRegistryReferral;
        mapping(address => ReferralPercentage) referralPercentage;
    }

    function referralStorage()
        internal
        pure
        returns (ReferralStorage storage rs)
    {
        bytes32 position = REFERRAL_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }
}
