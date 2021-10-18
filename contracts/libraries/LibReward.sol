// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibReward {
    bytes32 constant REWARD_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.reward");

    struct Reward {
        uint256 paidAmount;
        uint256 accumulatedAmount;
    }

    struct RewardStorage {
        // Loan owners' rewards
        mapping(uint256 => mapping(address => Reward)) loanRewards;
        // Protocol fees
        mapping(address => Reward) fees;
        // Protocol fee percentage
        uint256 feePercentage;
        // Protocol fee precision
        uint256 feePrecision;
    }

    function rewardStorage() internal pure returns (RewardStorage storage rs) {
        bytes32 position = REWARD_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }

    function distributeFees(
        uint256 _eNft,
        address _token,
        uint256 _amount
    ) internal {
        LibReward.RewardStorage storage ms = rewardStorage();

        uint256 rentFee = (_amount * ms.feePercentage) / ms.feePrecision;
        uint256 lenderReward = _amount - rentFee;
        ms.loanRewards[_eNft][_token].accumulatedAmount += lenderReward;
        ms.fees[_token].accumulatedAmount += rentFee;
    }

    function claimReward(uint256 _eNft, address _token)
        internal
        returns (uint256)
    {
        LibReward.Reward storage rewards = rewardStorage().loanRewards[_eNft][
            _token
        ];

        uint256 transferAmount = rewards.accumulatedAmount - rewards.paidAmount;
        rewards.paidAmount = rewards.accumulatedAmount;

        return transferAmount;
    }

    function claimFee(address _token) internal returns (uint256) {
        LibReward.Reward storage fees = rewardStorage().fees[_token];

        uint256 transferAmount = fees.accumulatedAmount - fees.paidAmount;
        fees.paidAmount = fees.accumulatedAmount;

        return transferAmount;
    }

    function setFeePercentage(uint256 _feePercentage) internal {
        require(
            _feePercentage < rewardStorage().feePrecision,
            "_feePercentage exceeds or equal to feePrecision"
        );
        rewardStorage().feePercentage = _feePercentage;
    }

    function setFeePrecision(uint256 _feePrecision) internal {
        rewardStorage().feePrecision = _feePrecision;
    }

    function protocolFeeFor(address _token)
        internal
        view
        returns (Reward memory)
    {
        return rewardStorage().fees[_token];
    }

    function loanRewardFor(uint256 _eNft, address _token)
        internal
        view
        returns (Reward memory)
    {
        return rewardStorage().loanRewards[_eNft][_token];
    }

    function feePercentage() internal view returns (uint256) {
        return rewardStorage().feePercentage;
    }

    function feePrecision() internal view returns (uint256) {
        return rewardStorage().feePrecision;
    }
}
