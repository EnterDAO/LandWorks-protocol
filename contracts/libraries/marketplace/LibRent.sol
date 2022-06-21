// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../LibERC721.sol";
import "../LibFee.sol";
import "../LibReferral.sol";
import "../LibTransfer.sol";
import "../marketplace/LibMarketplace.sol";

library LibRent {
    using SafeERC20 for IERC20;

    address constant ETHEREUM_PAYMENT_TOKEN = address(1);

    event Rent(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _renter,
        uint256 _start,
        uint256 _end,
        address indexed _paymentToken,
        uint256 _rent,
        uint256 _protocolFee
    );
    event AccrueReferralFee(address indexed _referrer, uint256 _fee);

    struct RentParams {
        uint256 _assetId;
        uint256 _period;
        uint256 _maxRentStart;
        address _paymentToken;
        uint256 _amount;
        address _referrer;
    }

    struct RentDistribution {
        uint256 rentFee;
        uint256 rentReward;
        uint256 protocolFee;
    }

    /// @dev Rents asset for a given period (in seconds)
    /// Rent is added to the queue of pending rents.
    /// Rent start will begin from the last rented timestamp.
    /// If no active rents are found, rents starts from the current timestamp.
    /// Protocol fee can be split into multiple referrals.
    /// Priority is the following:
    /// 1. Metaverse registry referrer: If the given asset metaverse registry has a metaverse
    /// referrer, it accrues a percent of the protocol fees to that referrer.
    /// 2.1. List referrer: Takes percentage of the leftovers based on `mainPercentage`.
    /// `mainPercentage` has a maximum percentage of 50 due to rent referrer.
    /// The lister itself might take percentage of the list referral based on `secondaryPercentage`,
    /// adding an additional amount to the rent reward.
    /// 2.2. Rent referrer: Takes percentage of the leftoveres based on `mainPercentage`.
    /// `mainPercentage` has a maximum percentage of 50 due to list referrer.
    /// The renter itself might take percentage of the rent referral based on `secondaryPerceange`,
    /// having a discount to the initial rent amount.
    /// 3. Protocol: Everything left is for the protocol.
    function rent(RentParams memory rentParams)
        internal
        returns (uint256, bool)
    {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        require(LibERC721.exists(rentParams._assetId), "_assetId not found");
        LibMarketplace.Asset memory asset = ms.assets[rentParams._assetId];
        require(
            asset.status == LibMarketplace.AssetStatus.Listed,
            "_assetId not listed"
        );
        require(
            rentParams._period >= asset.minPeriod,
            "_period less than minPeriod"
        );
        require(
            rentParams._period <= asset.maxPeriod,
            "_period more than maxPeriod"
        );
        require(
            rentParams._paymentToken == asset.paymentToken,
            "invalid _paymentToken"
        );
        if (rentParams._referrer != address(0)) {
            LibReferral.ReferrerPercentage memory rp = LibReferral
                .referralStorage()
                .referrerPercentages[rentParams._referrer];
            require(rp.mainPercentage > 0, "_referrer not whitelisted");
        }

        bool rentStartsNow = true;
        uint256 rentStart = block.timestamp;
        uint256 lastRentEnd = ms
        .rents[rentParams._assetId][asset.totalRents].end;

        if (lastRentEnd > rentStart) {
            rentStart = lastRentEnd;
            rentStartsNow = false;
        }
        require(
            rentStart <= rentParams._maxRentStart,
            "rent start exceeds maxRentStart"
        );

        uint256 rentEnd = rentStart + rentParams._period;
        require(
            block.timestamp + asset.maxFutureTime >= rentEnd,
            "rent more than current maxFutureTime"
        );

        uint256 rentPayment = rentParams._period * asset.pricePerSecond;
        RentDistribution memory rds = distributeFees(
            rentParams._assetId,
            asset.metaverseRegistry,
            asset.paymentToken,
            rentPayment,
            rentParams._referrer
        );

        require(rentParams._amount == rds.rentFee, "invalid _amount");
        if (asset.paymentToken == ETHEREUM_PAYMENT_TOKEN) {
            require(msg.value == rds.rentFee, "invalid msg.value");
        } else {
            require(msg.value == 0, "invalid token msg.value");
        }

        uint256 rentId = LibMarketplace.addRent(
            rentParams._assetId,
            msg.sender,
            rentStart,
            rentEnd
        );

        if (asset.paymentToken != ETHEREUM_PAYMENT_TOKEN) {
            LibTransfer.safeTransferFrom(
                asset.paymentToken,
                msg.sender,
                address(this),
                rds.rentFee
            );
        }

        emit Rent(
            rentParams._assetId,
            rentId,
            msg.sender,
            rentStart,
            rentEnd,
            asset.paymentToken,
            rds.rentReward,
            rds.protocolFee
        );

        return (rentId, rentStartsNow);
    }

    function distributeFees(
        uint256 assetId,
        address metaverseRegistry,
        address token,
        uint256 rentPayment,
        address rentReferrer
    ) internal returns (RentDistribution memory rds) {
        LibFee.FeeStorage storage fs = LibFee.feeStorage();
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();

        rds.protocolFee =
            (rentPayment * fs.feePercentages[token]) /
            LibFee.FEE_PRECISION;
        rds.rentReward = rentPayment - rds.protocolFee;
        rds.rentFee = rentPayment;

        // used to calculate the split of the total protocol fee to the different actors
        uint256 pFee = rds.protocolFee;

        uint256 protocolFeeLeft = pFee;
        {
            LibReferral.MetaverseRegistryReferrer memory mrr = rs
                .metaverseRegistryReferrers[metaverseRegistry];

            if (mrr.percentage > 0) {
                // take out metaverse registry fee
                uint256 metaverseReferralAmount = (pFee * mrr.percentage) /
                    10_000;
                rs.referrerFees[mrr.referrer][token] += metaverseReferralAmount;
                protocolFeeLeft = pFee - metaverseReferralAmount;

                emit AccrueReferralFee(mrr.referrer, metaverseReferralAmount);
            }
        }

        uint256 feesLeft = protocolFeeLeft;

        if (feesLeft > 0) {
            {
                address listReferrer = rs.listReferrer[assetId];
                // accrue listing referral fee
                if (listReferrer != address(0)) {
                    LibReferral.ReferrerPercentage memory rp = rs
                        .referrerPercentages[listReferrer];

                    if (rp.mainPercentage > 0) {
                        uint256 listReferralFee = (feesLeft *
                            rp.mainPercentage) / 10_000;
                        protocolFeeLeft -= listReferralFee;

                        uint256 listerFee = (listReferralFee *
                            rp.secondaryPercentage) / 10_000;
                        rds.protocolFee -= listerFee;
                        rds.rentReward += listerFee;
                        rs.referrerFees[listReferrer][
                            token
                        ] += (listReferralFee - listerFee);
                        emit AccrueReferralFee(
                            listReferrer,
                            listReferralFee - listerFee
                        );
                    }
                }
            }

            {
                // accrue rent referral fee
                if (rentReferrer != address(0)) {
                    LibReferral.ReferrerPercentage memory rp = rs
                        .referrerPercentages[rentReferrer];

                    uint256 rentReferralFee = (feesLeft * rp.mainPercentage) /
                        10_000;
                    protocolFeeLeft -= rentReferralFee;

                    uint256 renterDiscount = (rentReferralFee *
                        rp.secondaryPercentage) / 10_000;
                    rds.rentFee -= renterDiscount;
                    rs.referrerFees[rentReferrer][token] += (rentReferralFee -
                        renterDiscount);

                    emit AccrueReferralFee(
                        rentReferrer,
                        rentReferralFee - renterDiscount
                    );
                }
            }
        }

        fs.assetRentFees[assetId][token] += rds.rentReward;
        fs.protocolFees[token] += protocolFeeLeft;

        return rds;
    }
}
