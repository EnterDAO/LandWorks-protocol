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
    function rent(
        uint256 _assetId,
        uint256 _period,
        uint256 _maxRentStart,
        address _paymentToken,
        uint256 _amount,
        address _referral
    ) external payable returns (uint256, bool) {
        (uint256 rentId, bool rentStartsNow) = LibRent.rent(
            LibRent.RentParams({
                _assetId: _assetId,
                _period: _period,
                _maxRentStart: _maxRentStart,
                _paymentToken: _paymentToken,
                _amount: _amount,
                _referral: _referral
            })
        );
        return (rentId, rentStartsNow);
    }

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
    ) external view returns (uint256) {
        require(LibERC721.exists(_assetId), "_assetId not found");

        LibMarketplace.Asset memory asset = LibMarketplace.assetAt(_assetId);
        uint256 amount = _period * asset.pricePerSecond;
        uint256 protocolFee = (amount *
            LibFee.feeStorage().feePercentages[asset.paymentToken]) /
            LibFee.FEE_PRECISION;

        (, uint256 metaversePercentage) = LibReferral
            .referralStorage()
            .referralAdapter
            .metaverseRegistryReferral(asset.metaverseRegistry);

        // take out metaverse registry fee
        uint256 metaverseReferralAmount = (protocolFee * metaversePercentage) /
            10_000;
        uint256 referralsFeeLeft = protocolFee - metaverseReferralAmount;

        if (_referral != address(0)) {
            (
                uint256 rentReferralPercentage,
                uint256 rentUserReferralPercentage
            ) = LibReferral
                    .referralStorage()
                    .referralAdapter
                    .referralPercentage(_referral);
            uint256 rentReferralFee = (referralsFeeLeft *
                rentReferralPercentage) / 10_000;

            uint256 renterDiscount = (rentReferralFee *
                rentUserReferralPercentage) / 10_000;
            return referralsFeeLeft - renterDiscount;
        }
        return amount;
    }
}
