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

    struct RentParams {
        uint256 _assetId;
        uint256 _period;
        uint256 _maxRentStart;
        address _paymentToken;
        uint256 _amount;
        address _referral;
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
        if (rentParams._referral != address(0)) {
            LibReferral.ReferralPercentage memory rp = LibReferral
                .referralStorage()
                .referralPercentage[rentParams._referral];
            require(rp.mainPercentage > 0, "_referral not whitelisted");
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
            rentParams._referral
        );
        uint256 rentId = LibMarketplace.addRent(
            rentParams._assetId,
            msg.sender,
            rentStart,
            rentEnd
        );

        require(rentParams._amount == rds.rentFee, "invalid _amount");
        if (asset.paymentToken == ETHEREUM_PAYMENT_TOKEN) {
            require(msg.value == rds.rentFee, "invalid msg.value");
        } else {
            require(msg.value == 0, "invalid token msg.value");
        }

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
        address rentReferral
    ) internal returns (RentDistribution memory rds) {
        LibFee.FeeStorage storage fs = LibFee.feeStorage();
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();

        rds.protocolFee =
            (rentPayment * fs.feePercentages[token]) /
            LibFee.FEE_PRECISION;
        rds.rentReward = rentPayment - rds.protocolFee;
        rds.rentFee = rds.rentReward;

        // used to calculate the split of the total protocol fee to the different actors
        uint256 pFee = rds.protocolFee;

        uint256 protocolFeeLeft = distributeMetaversePortion(
            metaverseRegistry,
            token,
            pFee,
            rs
        );
        uint256 referralsFeeLeft = protocolFeeLeft;

        address listingReferral = rs.listingReferrals[assetId];
        // take out listing referral fee
        if (listingReferral != address(0)) {
            (protocolFeeLeft, rds) = distributeListingFee(
                listingReferral,
                token,
                referralsFeeLeft,
                protocolFeeLeft,
                rs,
                rds
            );
        }

        // take out rent referral fee
        if (rentReferral != address(0)) {
            (protocolFeeLeft, rds) = distributeRentFee(
                rentReferral,
                token,
                referralsFeeLeft,
                protocolFeeLeft,
                rds,
                rs
            );
        }

        fs.assetRentFees[assetId][token] += rds.rentReward;
        fs.protocolFees[token] += protocolFeeLeft;

        return rds;
    }

    function distributeMetaversePortion(
        address metaverseRegistry,
        address paymentToken,
        uint256 pFee,
        LibReferral.ReferralStorage storage rs
    ) internal returns (uint256) {
        LibReferral.MetaverseRegistryReferral memory mrr = rs
            .metaverseRegistryReferral[metaverseRegistry];

        // take out metaverse registry fee
        uint256 metaverseReferralAmount = (pFee * mrr.percentage) / 100_000;
        rs.referralFees[mrr.referral][paymentToken] += metaverseReferralAmount;

        return pFee - metaverseReferralAmount;
    }

    function distributeListingFee(
        address listingReferral,
        address paymentToken,
        uint256 referralsFeeLeft,
        uint256 protocolFeeLeft,
        LibReferral.ReferralStorage storage rs,
        RentDistribution memory rds
    ) internal returns (uint256, RentDistribution memory) {
        LibReferral.ReferralPercentage memory rp = rs.referralPercentage[
            listingReferral
        ];

        uint256 listingReferralFee = (referralsFeeLeft * rp.mainPercentage) /
            100_000;
        protocolFeeLeft -= listingReferralFee;

        uint256 listerFee = (listingReferralFee * rp.userPercentage) / 100_000;
        rds.protocolFee -= listerFee;
        rds.rentReward += listerFee;
        rs.referralFees[listingReferral][paymentToken] += (listingReferralFee -
            listerFee);

        return (protocolFeeLeft, rds);
    }

    function distributeRentFee(
        address rentReferral,
        address paymentToken,
        uint256 referralsFeeLeft,
        uint256 protocolFeeLeft,
        RentDistribution memory rds,
        LibReferral.ReferralStorage storage rs
    ) internal returns (uint256, RentDistribution memory) {
        LibReferral.ReferralPercentage memory rp = rs.referralPercentage[
            rentReferral
        ];
        uint256 rentReferralFee = (referralsFeeLeft * rp.mainPercentage) /
            100_000;
        protocolFeeLeft -= rentReferralFee;

        uint256 renterDiscount = (rentReferralFee * rp.userPercentage) /
            100_000;
        rds.rentFee -= renterDiscount;
        rs.referralFees[rentReferral][paymentToken] += (rentReferralFee -
            renterDiscount);

        return (protocolFeeLeft, rds);
    }
}
