// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title LibTransfer
/// @notice Contains helper methods for interacting with ETH,
/// ERC-20 and ERC-721 transfers. Serves as a wrapper for all
/// transfers.
library LibTransfer {
    using SafeERC20 for IERC20;

    /// @notice Transfers tokens from contract to a recipient
    /// @dev If amount is 0, transfer is not done
    /// If token is 0x0, an ETH transfer is done
    /// @param _token The target token
    /// @param _recipient The recipient of the transfer
    /// @param _amount The amount of the transfer
    function safeTransfer(
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        if (_amount != 0) {
            if (_token == address(0)) {
                payable(_recipient).transfer(_amount);
            } else {
                IERC20(_token).safeTransfer(_recipient, _amount);
            }
        }
    }

    function safeTransferFrom(
        address _token,
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        IERC20(_token).safeTransferFrom(_from, _to, _amount);
    }

    function erc721SafeTransferFrom(
        address _token,
        address _from,
        address _to,
        uint256 _tokenId
    ) internal {
        IERC721(_token).safeTransferFrom(_from, _to, _tokenId);
    }
}
