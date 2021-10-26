// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/ILandWorksNFT.sol";

import "../interfaces/IRewardFacet.sol";
import "../libraries/LibClaim.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibReward.sol";

contract RewardFacet is IRewardFacet {
    /// @notice Claims protocol fees of a given payment token
    /// Provide 0x0 for ETH
    /// @param _token The target token
    function claimFee(address _token) external {
        LibOwnership.enforceIsContractOwner();

        uint256 amount = LibReward.claimFee(_token);

        LibClaim.claim(_token, msg.sender, amount);

        emit ClaimFee(_token, msg.sender, amount);
    }

    /// @notice Claims accrued rent fees for a given eNft
    /// @param _eNft The target _eNft
    function claimReward(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of eNft"
        );

        address paymentToken = ms.assets[_eNft].paymentToken;
        uint256 amount = LibReward.claimReward(_eNft, paymentToken);

        LibClaim.claimReward(_eNft, paymentToken, msg.sender, amount);
    }

    /// @notice Sets the protocol fee for land rentals
    /// @param _feePercentage The fee percentage charged on every rent
    function setFee(uint256 _feePercentage) external {
        LibOwnership.enforceIsContractOwner();
        LibReward.setFeePercentage(_feePercentage);
        emit SetFee(msg.sender, _feePercentage);
    }

    /// @notice Sets the protocol fee precision
    /// Used to allow percentages with decimal franction
    /// @param _feePrecision The fee precision
    function setFeePrecision(uint256 _feePrecision) external {
        LibOwnership.enforceIsContractOwner();
        require(_feePrecision >= 10, "_feePrecision must not be single-digit");
        LibReward.setFeePrecision(_feePrecision);
        emit SetFeePrecision(msg.sender, _feePrecision);
    }

    /// @notice Sets status of token payment (accepted or not)
    /// @param _token The target token
    /// @param _status Whether the token will be approved or not
    function setTokenPayment(address _token, bool _status) external {
        require(_token != address(0), "_token must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibReward.setTokenPayment(_token, _status);

        emit SetTokenPayment(_token, _status);
    }

    /// @notice Gets whether the token payment is supported
    /// @param _token The target token
    function supportsTokenPayment(address _token) external view returns (bool) {
        return LibReward.supportsTokenPayment(_token);
    }

    /// @notice Gets the total amount of token payments
    function totalTokenPayments() external view returns (uint256) {
        return LibReward.totalTokenPayments();
    }

    /// @notice Gets the token payment at a given index
    function tokenPaymentAt(uint256 _index) external view returns (address) {
        return LibReward.tokenPaymentAt(_index);
    }

    /// @notice Gets the fee percentage
    function feePercentage() external view returns (uint256) {
        return LibReward.feePercentage();
    }

    /// @notice Gets the fee precision
    function feePrecision() external view returns (uint256) {
        return LibReward.feePrecision();
    }
}
