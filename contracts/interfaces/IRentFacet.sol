// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IRentFacet {
    /// @notice Rents an asset for a given period.
    /// Charges user for the rent upfront. Rent starts from the last rented timestamp
    /// or from the current timestamp of the transaction.
    /// @param _assetId The target asset
    /// @param _period The target rental period (in seconds)
    /// @param _maxRentStart The maximum rent start allowed for the given rent
    /// @param _paymentToken The current payment token for the asset
    /// @param _amount The target amount to be paid for the rent
    // TODO:
    function rent(
        uint256 _assetId,
        uint256 _period,
        uint256 _maxRentStart,
        address _paymentToken,
        uint256 _amount,
        address _referral
    ) external payable returns (uint256, bool);

    /// @notice Returns an asset rent fee based on period and referral
    /// Calculates the rent fee based on asset, period and referral.
    /// Depending on the referral discounts, it calculates whether
    /// a user discount might appear.
    /// @param _assetId The target asset
    /// @param _period The targe rental period (in seconds)
    /// @param _referral The address of the referral
    function calculateRentFee(
        uint256 _assetId,
        uint256 _period,
        address _referral
    ) external view returns (uint256);
}
