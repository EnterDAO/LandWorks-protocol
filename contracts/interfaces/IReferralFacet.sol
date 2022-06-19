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
    /// @notice Emitted once a referrer accrues referral fees
    event AccrueReferralFee(address indexed _referrer, uint256 _fee);

    /// @notice Sets a referral admin
    /// @param _admin The address of the to-be-set admin
    function setReferralAdmin(address _admin) external;

    /// @notice Sets an array of referrers
    /// @dev Referrers and percentages are followed by array index.
    /// @param _referrers The to-be-set referrers
    /// @param _mainPercentages The to-be-set main percentages for referrers
    /// @param _secondaryPercentages The to-be-set secondary percentages for referrers
    function setReferrers(
        address[] memory _referrers,
        uint16[] memory _mainPercentages,
        uint16[] memory _secondaryPercentages
    ) external;

    /// @notice Sets an array of metaverse registry referrers
    /// @dev Metaverse registries, referrers & percentages are followed by array index.
    /// @param _metaverseRegistries The target metaverse registries
    /// @param _referrers The to-be-set referrers for the metaverse registries
    /// @param _percentages The to-be-set referrer percentages for the metaverse registries
    function setMetaverseRegistryReferrers(
        address[] memory _metaverseRegistries,
        address[] memory _referrers,
        uint16[] memory _percentages
    ) external;

    /// @notice Claims unclaimed referrer fees for a given payment token
    /// @param _paymentToken The target payment token
    /// @return paymentToken_ The target payment token
    /// @return amount_ The claimed amount
    function claimReferrerFee(address _paymentToken)
        external
        returns (address paymentToken_, uint256 amount_);

    /// @notice Claims unclaimed referrer fees
    /// @param _paymentTokens The array of payment tokens
    function claimMultipleReferrerFees(address[] memory _paymentTokens)
        external;

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
