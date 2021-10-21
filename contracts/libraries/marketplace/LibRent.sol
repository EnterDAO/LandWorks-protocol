// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../../interfaces/ILandWorksNFT.sol";
import "../LibMarketplace.sol";
import "../LibReward.sol";

library LibRent {
    using SafeERC20 for IERC20;

    event Rent(
        uint256 _eNft,
        uint256 _rentId,
        address indexed _renter,
        uint256 _startBlock,
        uint256 _endBlock
    );

    /// @dev Rents eNft land for a given period
    /// Rent is added to the queue of pending rents.
    /// Rent start will begin from the last rented block.
    /// If no active rents are found, rents starts from the current block.
    function rent(uint256 _eNft, uint256 _period) internal returns (uint256) {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        require(
            ILandWorksNFT(ms.landWorksNft).ownerOf(_eNft) != address(0),
            "_eNft not found"
        );
        LibMarketplace.Loan memory loan = ms.loans[_eNft];
        require(
            loan.status == LibMarketplace.LoanStatus.Listed,
            "_eNft delisted"
        );
        require(_period >= loan.minPeriod, "_period less than minPeriod");
        require(_period <= loan.maxPeriod, "_period more than maxPeriod");

        uint256 rentStartBlock = block.number;
        uint256 lastRentEndBlock = ms.rents[_eNft][loan.totalRents].endBlock;
        if (lastRentEndBlock > rentStartBlock) {
            rentStartBlock = lastRentEndBlock;
        }

        uint256 rentEndBlock = rentStartBlock + _period;
        require(
            rentEndBlock <= block.number + loan.maxFutureBlock,
            "rent more than max future block rental"
        );

        uint256 rentPayment = _period * loan.pricePerBlock;
        if (loan.paymentToken == address(0)) {
            require(msg.value == rentPayment, "invalid msg.value");
        } else {
            IERC20(loan.paymentToken).safeTransferFrom(
                msg.sender,
                address(this),
                rentPayment
            );
        }

        LibReward.distributeFees(_eNft, loan.paymentToken, rentPayment);
        uint256 rentId = LibMarketplace.addRent(
            _eNft,
            msg.sender,
            rentStartBlock,
            rentEndBlock
        );

        emit Rent(_eNft, rentId, msg.sender, rentStartBlock, rentEndBlock);

        return rentId;
    }
}
