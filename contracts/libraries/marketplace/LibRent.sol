// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../LibERC721.sol";
import "../LibMarketplace.sol";
import "../LibFee.sol";

library LibRent {
    using SafeERC20 for IERC20;

    event Rent(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _renter,
        uint256 _startBlock,
        uint256 _endBlock
    );

    /// @dev Rents asset for a given period
    /// Rent is added to the queue of pending rents.
    /// Rent start will begin from the last rented block.
    /// If no active rents are found, rents starts from the current block.
    function rent(uint256 _assetId, uint256 _period)
        internal
        returns (uint256, bool)
    {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        require(LibERC721.exists(_assetId), "_assetId not found");
        LibMarketplace.Asset memory asset = ms.assets[_assetId];
        require(
            asset.status == LibMarketplace.AssetStatus.Listed,
            "_assetId not listed"
        );
        require(_period >= asset.minPeriod, "_period less than minPeriod");
        require(_period <= asset.maxPeriod, "_period more than maxPeriod");

        bool rentStartsNow = true;
        uint256 rentStartBlock = block.number;
        uint256 lastRentEndBlock = ms
        .rents[_assetId][asset.totalRents].endBlock;

        if (lastRentEndBlock > rentStartBlock) {
            rentStartBlock = lastRentEndBlock;
            rentStartsNow = false;
        }

        uint256 rentEndBlock = rentStartBlock + _period;
        require(
            block.number + asset.maxFutureBlock >= rentEndBlock,
            "rent more than current maxFutureBlock"
        );

        uint256 rentPayment = _period * asset.pricePerBlock;
        if (asset.paymentToken == address(0)) {
            require(msg.value == rentPayment, "invalid msg.value");
        } else {
            IERC20(asset.paymentToken).safeTransferFrom(
                msg.sender,
                address(this),
                rentPayment
            );
        }

        LibFee.distributeFees(_assetId, asset.paymentToken, rentPayment);
        uint256 rentId = LibMarketplace.addRent(
            _assetId,
            msg.sender,
            rentStartBlock,
            rentEndBlock
        );

        emit Rent(_assetId, rentId, msg.sender, rentStartBlock, rentEndBlock);

        return (rentId, rentStartsNow);
    }
}
