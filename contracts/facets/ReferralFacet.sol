// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IReferralFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibReferral.sol";
import "../libraries/LibTransfer.sol";

contract ReferralFacet is IReferralFacet {
    function setReferralAdmin(address _admin) external {
        LibOwnership.enforceIsContractOwner();

        LibReferral.referralStorage().admin = _admin;

        emit SetReferralAdmin(_admin);
    }

    function setReferrals(
        address[] memory _referrals,
        uint256[] memory _percentages,
        uint256[] memory _userPercentages
    ) external {
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();
        require(rs.admin == msg.sender, "caller is not admin");

        for (uint256 i = 0; i < _referrals.length; i++) {
            require(_referrals[i] != address(0), "_referral cannot be 0x0");
            require(_percentages[i] <= 50_000, "_percentage cannot exceed 50");
            require(
                _userPercentages[i] <= 100_000,
                "_userPercentage cannot exceed 100"
            );

            rs.referralPercentage[_referrals[i]] = LibReferral
                .ReferralPercentage({
                    mainPercentage: _percentages[i],
                    userPercentage: _userPercentages[i]
                });
            emit SetReferral(
                _referrals[i],
                _percentages[i],
                _userPercentages[i]
            );
        }
    }

    function setMetaverseRegistryReferral(
        address[] memory _metaverseRegistries,
        address[] memory _referrals,
        uint256[] memory _percentages
    ) external {
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();
        require(rs.admin == msg.sender, "caller is not admin");

        for (uint256 i = 0; i < _metaverseRegistries.length; i++) {
            require(
                _metaverseRegistries[i] != address(0),
                "_metaverseRegistry cannot be 0x0"
            );
            require(_referrals[i] != address(0), "_referral cannot be 0x0");
            require(
                _percentages[i] <= 100_000,
                "_referralPercentage exceeds maximum"
            );

            rs.metaverseRegistryReferral[_metaverseRegistries[i]] = LibReferral
                .MetaverseRegistryReferral({
                    referral: _referrals[i],
                    percentage: _percentages[i]
                });
        }
    }

    function claimReferralFee(address _paymentToken)
        public
        returns (address token_, uint256 amount_)
    {
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();
        uint256 amount = rs.referralFees[msg.sender][_paymentToken];
        require(amount > 0, "amount cannot be zero");
        rs.referralFees[msg.sender][_paymentToken] = 0;

        LibTransfer.safeTransfer(_paymentToken, msg.sender, amount);

        emit ClaimReferralFee(msg.sender, _paymentToken, amount);

        return (_paymentToken, amount);
    }

    function claimMultipleReferralFees(address[] memory _tokens) external {
        for (uint256 i = 0; i < _tokens.length; i++) {
            claimReferralFee(_tokens[i]);
        }
    }

    function referralFee(address _referrer, address _token)
        external
        view
        returns (uint256 amount_)
    {
        return LibReferral.referralStorage().referralFees[_referrer][_token];
    }

    function metaverseRegistryReferral(address _metaverseRegistry)
        external
        view
        returns (LibReferral.MetaverseRegistryReferral memory)
    {
        return
            LibReferral.referralStorage().metaverseRegistryReferral[
                _metaverseRegistry
            ];
    }

    function referralPercentage(address _referral)
        external
        view
        returns (LibReferral.ReferralPercentage memory)
    {
        return LibReferral.referralStorage().referralPercentage[_referral];
    }
}
