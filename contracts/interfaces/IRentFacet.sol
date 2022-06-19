// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./IRentable.sol";
import "../libraries/marketplace/LibMarketplace.sol";

interface IRentFacet is IRentable {
    /// @notice Rents an asset for a given period.
    /// Charges user for the rent upfront. Rent starts from the last rented timestamp
    /// or from the current timestamp of the transaction.
    /// @param _assetId The target asset
    /// @param _period The target rental period (in seconds)
    /// @param _maxRentStart The maximum rent start allowed for the given rent
    /// @param _paymentToken The current payment token for the asset
    /// @param _amount The target amount to be paid for the rent
    /// @param _referrer The target referrer
    function rent(
        uint256 _assetId,
        uint256 _period,
        uint256 _maxRentStart,
        address _paymentToken,
        uint256 _amount,
        address _referrer
    ) external payable returns (uint256, bool);

    /// @notice Gets all data for a specific rent of an asset
    /// @param _assetId The taget asset
    /// @param _rentId The target rent
    function rentAt(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory);

    /// @notice Returns an asset rent fee based on period and referrer
    /// Calculates the rent fee based on asset, period and referrer.
    /// Depending on the referral discounts, it calculates the amount that
    /// users have to provide upon rent.
    /// @dev Reverts if the _referrer is not whitelisted.
    /// Each referrer has main & secondary percentage.
    /// Each rent referrer gets a main percentage portion from the protocol fees.
    /// The secondary percentage is used to calculate the discount for the renter from the dedicated rent portion,
    /// and the leftovers are accrued to the rent referrer.
    /// @param _assetId The target asset
    /// @param _period The targe rental period (in seconds)
    /// @param _referrer The target referrer
    function calculateRentFee(
        uint256 _assetId,
        uint256 _period,
        address _referrer
    ) external view returns (uint256);
}
