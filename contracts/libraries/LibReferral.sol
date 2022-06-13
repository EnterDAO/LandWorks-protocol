// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IReferralAdapterV1.sol";

library LibReferral {
    bytes32 constant REFERRAL_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.referral");

    struct ReferralStorage {
        // Stores authorised referral addresses
        IReferralAdapterV1 referralAdapter;
        // Stores addresses of listing referrals
        mapping(uint256 => address) listingReferrals;
        // Referral fees address => paymentToken => amount
        mapping(address => mapping(address => uint256)) referralFees;
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
