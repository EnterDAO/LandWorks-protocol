// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibMarketplace {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant MARKETPLACE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.marketplace");

    enum LoanStatus {
        Listed,
        Delisted
    }

    struct Loan {
        address contractAddress;
        uint256 tokenId;
        address paymentToken;
        uint256 minPeriod;
        uint256 maxPeriod;
        uint256 maxFutureBlock;
        uint256 pricePerBlock;
        uint256 totalRents;
        LoanStatus status;
    }

    struct Rent {
        address renter;
        uint256 startBlock;
        uint256 endBlock;
    }

    struct Reward {
        uint256 paidAmount;
        uint256 accumulatedAmount;
    }

    struct MarketplaceStorage {
        bool initialized;
        // Address of the LandWorks NFT
        address landWorksNft;
        // Loans
        mapping(uint256 => Loan) loans;
        // Rents
        mapping(uint256 => mapping(uint256 => Rent)) rents;
        // Loan owners' rewards
        mapping(uint256 => mapping(address => Reward)) loanRewards;
        // Protocol fees
        mapping(address => Reward) fees;
        // Protocol fee precision
        uint256 feePrecision;
        // Protocol fee percentage
        uint256 feePercentage;
        // Supported tokens as a form of payment
        EnumerableSet.AddressSet tokenPayments;
    }

    function marketplaceStorage()
        internal
        pure
        returns (MarketplaceStorage storage ms)
    {
        bytes32 position = MARKETPLACE_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }

    function distributeFees(
        uint256 _eNft,
        address _token,
        uint256 _amount
    ) internal {
        LibMarketplace.MarketplaceStorage storage ms = marketplaceStorage();

        uint256 rentFee = (_amount * ms.feePercentage) / ms.feePrecision;
        uint256 lenderReward = _amount - rentFee;
        ms.loanRewards[_eNft][_token].accumulatedAmount += lenderReward;
        ms.fees[_token].accumulatedAmount += rentFee;
    }

    function claimReward(uint256 _eNft, address _token)
        internal
        returns (uint256)
    {
        LibMarketplace.Reward storage rewards = marketplaceStorage()
            .loanRewards[_eNft][_token];

        uint256 transferAmount = rewards.accumulatedAmount - rewards.paidAmount;
        rewards.paidAmount = rewards.accumulatedAmount;

        return transferAmount;
    }

    function claimFee(address _token) internal returns (uint256) {
        LibMarketplace.Reward storage fees = marketplaceStorage().fees[_token];

        uint256 transferAmount = fees.accumulatedAmount - fees.paidAmount;
        fees.paidAmount = fees.accumulatedAmount;

        return transferAmount;
    }

    function addRent(
        uint256 _eNft,
        address _renter,
        uint256 _startBlock,
        uint256 _endBlock
    ) internal returns (uint256) {
        LibMarketplace.MarketplaceStorage storage ms = marketplaceStorage();
        uint256 newRentId = ms.loans[_eNft].totalRents + 1;

        ms.loans[_eNft].totalRents = newRentId;
        ms.rents[_eNft][ms.loans[_eNft].totalRents] = LibMarketplace.Rent({
            renter: _renter,
            startBlock: _startBlock,
            endBlock: _endBlock
        });

        return newRentId;
    }

    function setFeePercentage(uint256 _feePercentage) internal {
        require(
            _feePercentage < marketplaceStorage().feePrecision,
            "_feePercentage exceeds or equal to feePrecision"
        );
        marketplaceStorage().feePercentage = _feePercentage;
    }

    function setFeePrecision(uint256 _feePrecision) internal {
        marketplaceStorage().feePrecision = _feePrecision;
    }

    function setTokenPayment(address _token, bool _status) internal {
        MarketplaceStorage storage ms = marketplaceStorage();
        if (_status) {
            require(ms.tokenPayments.add(_token), "_token already added");
        } else {
            require(ms.tokenPayments.remove(_token), "_token not found");
        }
    }

    function supportsTokenPayment(address _token) internal view returns (bool) {
        return marketplaceStorage().tokenPayments.contains(_token);
    }
}
