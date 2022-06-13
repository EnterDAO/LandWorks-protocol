// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReferralAdapterV1 is Ownable {
    struct MetaverseRegistryReferral {
        address referral;
        uint256 percentage;
    }
    struct ReferralPercentage {
        uint256 mainPercentage;
        uint256 userPercentage;
    }
    uint256 constant BASIS_POINTS = 10_000;

    mapping(address => MetaverseRegistryReferral)
        public metaverseRegistryReferral;
    mapping(address => ReferralPercentage) public referralPercentage;

    event WhitelistedReferral(address indexed _referral, uint256 _percentage);

    function setWhitelisted(
        address[] memory _referrals,
        uint256[] memory _percentages,
        uint256[] memory _userPercentages
    ) external onlyOwner {
        for (uint256 i = 0; i < _referrals.length; i++) {
            require(_referrals[i] != address(0), "_referral cannot be 0x0");
            require(_percentages[i] <= 5_000, "_percentage cannot exceed 50");
            require(
                _userPercentages[i] <= BASIS_POINTS,
                "_userPercentage cannot exceed 50"
            );

            referralPercentage[_referrals[i]] = ReferralPercentage({
                mainPercentage: _percentages[i],
                userPercentage: _userPercentages[i]
            });
            emit WhitelistedReferral(_referrals[i], _percentages[i]);
        }
    }

    function setMetaverseRegistryReferral(
        address _metaverseRegistry,
        address _referral,
        uint256 _referralPercentage
    ) external onlyOwner {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry cannot be 0x0"
        );
        require(_referral != address(0), "_referral cannot be 0x0");
        require(
            _referralPercentage <= BASIS_POINTS,
            "_referralPercentage exceeds maximum"
        );

        metaverseRegistryReferral[
            _metaverseRegistry
        ] = MetaverseRegistryReferral({
            referral: _referral,
            percentage: _referralPercentage
        });
    }
}
