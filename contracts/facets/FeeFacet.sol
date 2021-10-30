// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IFeeFacet.sol";
import "../libraries/LibERC721.sol";
import "../libraries/LibClaim.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibFee.sol";

contract FeeFacet is IFeeFacet {
    /// @notice Claims protocol fees of a given payment token
    /// Provide 0x0 for ETH
    /// @param _token The target token
    function claimProtocolFee(address _token) external {
        LibOwnership.enforceIsContractOwner();

        uint256 protocolFee = LibFee.claimProtocolFee(_token);

        LibClaim.transfer(_token, msg.sender, protocolFee);

        emit ClaimFee(_token, msg.sender, protocolFee);
    }

    /// @notice Claims accrued rent fees for a given eNft
    /// @param _eNft The target _eNft
    function claimRentFee(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of eNft"
        );

        address paymentToken = ms.assets[_eNft].paymentToken;
        uint256 amount = LibFee.claimRentFee(_eNft, paymentToken);

        LibClaim.transferRentFee(_eNft, paymentToken, msg.sender, amount);
    }

    /// @notice Sets the protocol fee for token payments
    /// @param _token The target token
    /// @param _feePercentage The fee percentage, charged on every rent
    function setFee(address _token, uint256 _feePercentage) external {
        LibOwnership.enforceIsContractOwner();
        LibFee.setFeePercentage(_token, _feePercentage);
    }

    /// @notice Sets the protocol fee precision
    /// Used to allow percentages with decimal franction
    /// @param _feePrecision The fee precision
    function setFeePrecision(uint256 _feePrecision) external {
        LibOwnership.enforceIsContractOwner();
        require(_feePrecision >= 10, "_feePrecision must not be single-digit");
        LibFee.setFeePrecision(_feePrecision);
        emit SetFeePrecision(msg.sender, _feePrecision);
    }

    /// @notice Sets status of token payment (accepted or not) and its fee
    /// @param _token The target token
    /// @param _feePercentage The fee percentage, charged on every rent
    /// @param _status Whether the token will be approved or not
    function setTokenPayment(
        address _token,
        uint256 _feePercentage,
        bool _status
    ) external {
        require(_token != address(0), "_token must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibFee.setTokenPayment(_token, _status);
        LibFee.setFeePercentage(_token, _feePercentage);
    }

    /// @notice Gets the accumulated and paid amount of fees for a payment token
    /// @param _token The target token
    function protocolFeeFor(address _token)
        external
        view
        returns (LibFee.Fee memory)
    {
        return LibFee.protocolFeeFor(_token);
    }

    /// @notice Gets the accumulated and paid amount of asset rent fees of a payment
    /// token for an eNft
    /// @param _eNft The target eNft
    /// @param _token The target token
    function assetRentFeesFor(uint256 _eNft, address _token)
        external
        view
        returns (LibFee.Fee memory)
    {
        return LibFee.assetRentFeesFor(_eNft, _token);
    }

    /// @notice Gets whether the token payment is supported
    /// @param _token The target token
    function supportsTokenPayment(address _token) external view returns (bool) {
        return LibFee.supportsTokenPayment(_token);
    }

    /// @notice Gets the total amount of token payments
    function totalTokenPayments() external view returns (uint256) {
        return LibFee.totalTokenPayments();
    }

    /// @notice Gets the token payment at a given index
    function tokenPaymentAt(uint256 _index) external view returns (address) {
        return LibFee.tokenPaymentAt(_index);
    }

    /// @notice Gets the fee percentage for a token payment
    /// @param _token The target token
    function feePercentage(address _token) external view returns (uint256) {
        return LibFee.feePercentage(_token);
    }

    /// @notice Gets the fee precision
    function feePrecision() external view returns (uint256) {
        return LibFee.feePrecision();
    }
}
