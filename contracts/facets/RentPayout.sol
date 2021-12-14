// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/LibERC721.sol";
import "../libraries/LibTransfer.sol";
import "../libraries/LibFee.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../interfaces/IRentPayout.sol";

contract RentPayout is IRentPayout {

    modifier payout(uint256 tokenId) {
        payoutRent(tokenId);
        _;
    }

    /// @dev Pays out the accumulated rent for a given tokenId
    /// Rent is paid out to consumer if set, otherwise it is paid to the owner of the LandWorks NFT
    /// IMPORTANT! Every method calling this function must protect itself from reentrancy
    function payoutRent(uint256 tokenId) internal {
        address paymentToken = LibMarketplace
        .marketplaceStorage()
        .assets[tokenId]
        .paymentToken;
        uint256 amount = LibFee.clearAccumulatedRent(tokenId, paymentToken);
        if (amount == 0) {
            return;
        }

        address receiver = LibERC721.consumerOf(tokenId);
        if (receiver == address(0)) {
            receiver = LibERC721.ownerOf(tokenId);
        }

        LibTransfer.safeTransfer(paymentToken, receiver, amount);
        emit ClaimRentFee(tokenId, paymentToken, receiver, amount);
    }

}
