// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/marketplace/LibMarketplace.sol";

interface IRentFacet {
    /// @notice Rents an asset for a given period.
    /// Charges user for the rent upfront. Rent starts from the last rented timestamp
    /// or from the current timestamp of the transaction.
    /// @param _assetId The target asset
    /// @param _period The target rental period (in seconds)
    /// @param _maxRentStart The maximum rent start allowed for the given rent
    /// @param _paymentToken The current payment token for the asset
    /// @param _amount The target amount to be paid for the rent
    /// @param _referral The target referral
    function rent(
        uint256 _assetId,
        uint256 _period,
        uint256 _maxRentStart,
        address _paymentToken,
        uint256 _amount,
        address _referral
    ) external payable returns (uint256, bool);

    /// @notice Gets all data for a specific rent of an asset
    /// @param _assetId The taget asset
    /// @param _rentId The target rent
    function rentAt(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory);

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
