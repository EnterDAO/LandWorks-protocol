// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibReward {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant REWARD_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.reward");

    event SetTokenPayment(address _token, bool _status);
    event SetFee(address _token, uint256 _fee);

    struct Reward {
        uint256 paidAmount;
        uint256 accumulatedAmount;
    }

    struct RewardStorage {
        // Supported tokens as a form of payment
        EnumerableSet.AddressSet tokenPayments;
        // Protocol fee percentages for tokens
        mapping(address => uint256) feePercentages;
        // Asset owners' rewards
        mapping(uint256 => mapping(address => Reward)) assetRewards;
        // Protocol fees
        mapping(address => Reward) fees;
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

        uint256 rentFee = (_amount * ms.feePercentages[_token]) /
            ms.feePrecision;
        uint256 lenderReward = _amount - rentFee;
        ms.assetRewards[_eNft][_token].accumulatedAmount += lenderReward;
        ms.fees[_token].accumulatedAmount += rentFee;
    }

    function claimReward(uint256 _eNft, address _token)
        internal
        returns (uint256)
    {
        LibReward.Reward storage rewards = rewardStorage().assetRewards[_eNft][
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

    function setFeePercentage(address _token, uint256 _feePercentage) internal {
        require(
            _feePercentage < rewardStorage().feePrecision,
            "_feePercentage exceeds or equal to feePrecision"
        );
        rewardStorage().feePercentages[_token] = _feePercentage;

        emit SetFee(_token, _feePercentage);
    }

    function setFeePrecision(uint256 _feePrecision) internal {
        rewardStorage().feePrecision = _feePrecision;
    }

    function setTokenPayment(address _token, bool _status) internal {
        RewardStorage storage gs = rewardStorage();
        if (_status) {
            require(gs.tokenPayments.add(_token), "_token already added");
        } else {
            require(gs.tokenPayments.remove(_token), "_token not found");
        }

        emit SetTokenPayment(_token, _status);
    }

    function supportsTokenPayment(address _token) internal view returns (bool) {
        return rewardStorage().tokenPayments.contains(_token);
    }

    function totalTokenPayments() internal view returns (uint256) {
        return rewardStorage().tokenPayments.length();
    }

    function tokenPaymentAt(uint256 _index) internal view returns (address) {
        return rewardStorage().tokenPayments.at(_index);
    }

    function protocolFeeFor(address _token)
        internal
        view
        returns (Reward memory)
    {
        return rewardStorage().fees[_token];
    }

    function assetRewardFor(uint256 _eNft, address _token)
        internal
        view
        returns (Reward memory)
    {
        return rewardStorage().assetRewards[_eNft][_token];
    }

    function feePercentage(address _token) internal view returns (uint256) {
        return rewardStorage().feePercentages[_token];
    }

    function feePrecision() internal view returns (uint256) {
        return rewardStorage().feePrecision;
    }
}
