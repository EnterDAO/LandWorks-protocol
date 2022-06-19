// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IERC721Consumable.sol";
import "../interfaces/IRentFacet.sol";
import "../libraries/LibERC721.sol";
import "../libraries/LibTransfer.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibRent.sol";

contract RentFacet is IRentFacet {
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
    ) external payable returns (uint256, bool) {
        (uint256 rentId, bool rentStartsNow) = LibRent.rent(
            LibRent.RentParams({
                _assetId: _assetId,
                _period: _period,
                _maxRentStart: _maxRentStart,
                _paymentToken: _paymentToken,
                _amount: _amount,
                _referrer: _referrer
            })
        );
        return (rentId, rentStartsNow);
    }

    /// @notice Gets all data for a specific rent of an asset
    /// @param _assetId The taget asset
    /// @param _rentId The target rent
    function rentAt(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory)
    {
        return LibMarketplace.rentAt(_assetId, _rentId);
    }

    /// @notice Returns an asset rent fee based on period and referrer
    /// Calculates the rent fee based on asset, period and referrer.
    /// Depending on the referral discounts, it calculates the amount that
    /// users have to provide upon rent.
    /// @dev Reverts if the _referrer is not whitelisted.
    /// Each referrer has main & secondary percentage.
    /// Each rent referral gets a main percentage portion from the protocol fees.
    /// The secondary percentage is used to calculate the discount for the renter from the dedicated rent portion,
    /// and the leftovers are accrued to the rent referrer.
    /// @param _assetId The target asset
    /// @param _period The targe rental period (in seconds)
    /// @param _referrer The address of the referrer
    function calculateRentFee(
        uint256 _assetId,
        uint256 _period,
        address _referrer
    ) external view returns (uint256) {
        require(LibERC721.exists(_assetId), "_assetId not found");

        LibMarketplace.Asset memory asset = LibMarketplace.assetAt(_assetId);
        uint256 amount = _period * asset.pricePerSecond;
        uint256 protocolFee = (amount *
            LibFee.feeStorage().feePercentages[asset.paymentToken]) /
            LibFee.FEE_PRECISION;

        LibReferral.MetaverseRegistryReferrer memory mrr = LibReferral
            .referralStorage()
            .metaverseRegistryReferrers[asset.metaverseRegistry];

        // take out metaverse registry fee
        uint256 metaverseReferralAmount = (protocolFee * mrr.percentage) /
            10_000;
        uint256 feesLeft = protocolFee - metaverseReferralAmount;

        if (_referrer != address(0)) {
            LibReferral.ReferrerPercentage memory rp = LibReferral
                .referralStorage()
                .referrerPercentages[_referrer];

            require(rp.mainPercentage > 0, "_referrer not whitelisted");

            uint256 rentReferrerFee = (feesLeft * rp.mainPercentage) / 10_000;

            uint256 renterDiscount = (rentReferrerFee *
                rp.secondaryPercentage) / 10_000;
            return amount - renterDiscount;
        }

        return amount;
    }
}
