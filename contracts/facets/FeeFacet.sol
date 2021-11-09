// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IFeeFacet.sol";
import "../libraries/LibERC721.sol";
import "../libraries/LibTransfer.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibFee.sol";

contract FeeFacet is IFeeFacet {
    /// @notice Claims protocol fees of a given payment token
    /// Provide 0x0 for ETH
    /// @param _token The target token
    function claimProtocolFee(address _token) public {
        LibOwnership.enforceIsContractOwner();

        uint256 protocolFee = LibFee.claimProtocolFee(_token);

        LibTransfer.safeTransfer(_token, msg.sender, protocolFee);

        emit ClaimProtocolFee(_token, msg.sender, protocolFee);
    }

    /// @notice Claims protocol fees for a set of tokens
    /// @param _tokens The array of tokens
    function claimProtocolFees(address[] calldata _tokens) public {
        LibOwnership.enforceIsContractOwner();

        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];

            uint256 protocolFee = LibFee.claimProtocolFee(token);
            LibTransfer.safeTransfer(token, msg.sender, protocolFee);

            emit ClaimProtocolFee(token, msg.sender, protocolFee);
        }
    }

    /// @notice Claims unclaimed rent fees for a given asset
    /// @param _assetId The target _assetId
    function claimRentFee(uint256 _assetId) public {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _assetId),
            "caller must be approved or owner of asset"
        );

        address paymentToken = ms.assets[_assetId].paymentToken;
        uint256 amount = LibFee.claimRentFee(_assetId, paymentToken);

        LibTransfer.safeTransfer(paymentToken, msg.sender, amount);
        emit ClaimRentFee(_assetId, paymentToken, msg.sender, amount);
    }

    /// @notice Claims unclaimed rent fees for a set of assets
    /// @param _assetIds The array of asset ids
    function claimMultipleRentFees(uint256[] calldata _assetIds) public {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        for (uint256 i = 0; i < _assetIds.length; i++) {
            uint256 assetId = _assetIds[i];
            require(
                LibERC721.isApprovedOrOwner(msg.sender, assetId),
                "caller must be approved or owner of asset"
            );

            address paymentToken = ms.assets[assetId].paymentToken;
            uint256 amount = LibFee.claimRentFee(assetId, paymentToken);

            LibTransfer.safeTransfer(paymentToken, msg.sender, amount);
            emit ClaimRentFee(assetId, paymentToken, msg.sender, amount);
        }
    }

    /// @notice Sets the protocol fee for token payments
    /// @param _token The target token
    /// @param _feePercentage The fee percentage, charged on every rent
    function setFee(address _token, uint256 _feePercentage) external {
        LibOwnership.enforceIsContractOwner();
        LibFee.setFeePercentage(_token, _feePercentage);
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

    /// @notice Gets the unclaimed amount of fees for a payment token
    /// @param _token The target token
    function protocolFeeFor(address _token) external view returns (uint256) {
        return LibFee.protocolFeeFor(_token);
    }

    /// @notice Gets the unclaimed amount of asset rent fees of a payment
    /// token for an asset
    /// @param _assetId The target asset
    /// @param _token The target token
    function assetRentFeesFor(uint256 _assetId, address _token)
        external
        view
        returns (uint256)
    {
        return LibFee.assetRentFeesFor(_assetId, _token);
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
    function feePrecision() external pure returns (uint256) {
        return LibFee.FEE_PRECISION;
    }
}
