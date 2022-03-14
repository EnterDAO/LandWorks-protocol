// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../libraries/LibERC721.sol";
import "../libraries/LibTransfer.sol";
import "../libraries/LibFee.sol";
import "../libraries/marketplace/LibMarketplace.sol";
import "../interfaces/IRentPayout.sol";

contract RentPayout is IRentPayout {
    modifier payout(uint256 tokenId, address _receiver) {
        payoutRent(tokenId, _receiver);
        _;
    }

    /// @dev Pays out the accumulated rent for a given tokenId
    /// Rent is paid out to receiver address.
    /// Returns the payment token and amount.
    function payoutRent(uint256 tokenId, address receiver)
        internal
        returns (address, uint256)
    {
        require(receiver != address(0), "receiver cannot be 0x0");
        address paymentToken = LibMarketplace
            .marketplaceStorage()
            .assets[tokenId]
            .paymentToken;
        uint256 amount = LibFee.clearAccumulatedRent(tokenId, paymentToken);
        if (amount == 0) {
            return (paymentToken, amount);
        }

        LibTransfer.safeTransfer(paymentToken, receiver, amount);
        emit ClaimRentFee(tokenId, paymentToken, receiver, amount);

        return (paymentToken, amount);
    }
}
