// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/LibReferral.sol";

interface IReferralFacet {
    /// @notice Emitted once a given referrer fee has been claimed
    event ClaimReferrerFee(
        address indexed _claimer,
        address indexed _token,
        uint256 _amount
    );

    /// @notice Emitted once the referrals admin has been changed
    event SetReferralAdmin(address indexed _admin);

    /// @notice Emitted once a referrer has been updated
    event SetReferrer(
        address indexed _referrer,
        uint16 _mainPercentage,
        uint16 _secondaryPercentage
    );
    /// @notice Emitted once a metaverse registry referrer has been updated
    event SetMetaverseRegistryReferrer(
        address indexed _metaverseRegistry,
        address indexed _referrer,
        uint16 _percentage
    );

    /// @notice Sets a referral admin
    /// Manages the addition/removal of referrers.
    /// @param _admin The address of the to-be-set admin
    function setReferralAdmin(address _admin) external;

    /// @notice Sets an array of referrers
    /// Used as referrers upon listings and rents.
    /// Referrers accrue part of the protocol fees upon each asset rent.
    /// @dev Referrers and percentages are followed by array index.
    /// Percentages are passed in basis points.
    /// Maximum `mainPercentage` is 5_000 (50%), as list and rent referrers
    /// have equal split of the protocol fees.
    /// 'secondaryPercentage` takes a percetange of the calculated `mainPercentage` fraction.
    /// @param _referrers The to-be-set referrers
    /// @param _mainPercentages The to-be-set main percentages for referrers
    /// @param _secondaryPercentages The to-be-set secondary percentages for referrers
    function setReferrers(
        address[] memory _referrers,
        uint16[] memory _mainPercentages,
        uint16[] memory _secondaryPercentages
    ) external;

    /// @notice Sets an array of metaverse registry referrers
    /// Adds a referrer to each metaverse registry.
    /// Accrues part of the protocol fees upon each asset rent, which is from the
    /// metaverse registry.
    /// @dev Metaverse registries, referrers & percentages are followed by array index.
    /// Percentages are passed in basis points.
    /// Maximum `percentage` is 10_000 (100%).
    /// @param _metaverseRegistries The target metaverse registries
    /// @param _referrers The to-be-set referrers for the metaverse registries
    /// @param _percentages The to-be-set referrer percentages for the metaverse registries
    function setMetaverseRegistryReferrers(
        address[] memory _metaverseRegistries,
        address[] memory _referrers,
        uint16[] memory _percentages
    ) external;

    /// @notice Claims unclaimed referrer fees for a given payment token
    /// @dev Does not emit event if amount is 0.
    /// @param _paymentToken The target payment token
    /// @return paymentToken_ The target payment token
    /// @return amount_ The claimed amount
    function claimReferrerFee(address _paymentToken)
        external
        returns (address paymentToken_, uint256 amount_);

    /// @notice Claims unclaimed referrer fees
    /// @dev Does not emit event if amount is 0.
    /// @param _paymentTokens The array of payment tokens
    function claimMultipleReferrerFees(address[] memory _paymentTokens)
        external;

    /// @notice Returns the referral admin
    function referralAdmin() external view returns (address);

    /// @notice Returns the accrued referrer amount for a given payment token
    /// @param _referrer The address of the referrer
    /// @param _token The target payment token
    /// @return amount_ The accrued referrer amount
    function referrerFee(address _referrer, address _token)
        external
        view
        returns (uint256 amount_);

    /// @notice Returns the referrer and percentage for a metaverse registry.
    /// @param _metaverseRegistry The target metaverse registry
    function metaverseRegistryReferrer(address _metaverseRegistry)
        external
        view
        returns (LibReferral.MetaverseRegistryReferrer memory);

    /// @notice Returns the referrer main & secondary percentages
    /// @param _referrer The target referrer
    function referrerPercentage(address _referrer)
        external
        view
        returns (LibReferral.ReferrerPercentage memory);
}
