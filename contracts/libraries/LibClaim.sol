// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library LibClaim {
    using SafeERC20 for IERC20;

    event ClaimReward(
        uint256 _eNft,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );

    function claimReward(
        uint256 _eNft,
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        claim(_token, _recipient, _amount);
        emit ClaimReward(_eNft, _token, _recipient, _amount);
    }

    function claim(
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
}
