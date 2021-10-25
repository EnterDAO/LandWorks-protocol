// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../libraries/LibMarketplace.sol";
import "../libraries/LibReward.sol";

interface IMarketplaceFacet {
    event Add(
        uint256 _eNft,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    );
    event UpdateConditions(
        uint256 _eNft,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    );
    event Rent(
        uint256 _eNft,
        uint256 _rentId,
        address indexed _renter,
        uint256 _startBlock,
        uint256 _endBlock
    );
    event Delist(uint256 _eNft, address indexed _caller);
    event Withdraw(uint256 _eNft, address indexed _caller);
    event ClaimFee(address _token, address _recipient, uint256 _amount);
    event ClaimReward(
        uint256 _eNft,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetRegistry(address _registry, bool _status);

    function initMarketplace(address _landWorksNft) external;

    function add(
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external;

    function updateConditions(
        uint256 _eNft,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external;

    function delist(uint256 _eNft) external;

    function withdraw(uint256 _eNft) external;

    function rent(uint256 _eNft, uint256 _period) external payable;

    function claimReward(uint256 _eNft) external;

    function claimFee(address _token) external;

    function setRegistry(address _registry, bool _status) external;

    function supportsRegistry(address _registry) external view returns (bool);

    function totalRegistries() external view returns (uint256);

    function registryAt(uint256 _index) external view returns (address);

    function landWorksNft() external view returns (address);

    function assetAt(uint256 _eNft)
        external
        view
        returns (LibMarketplace.Asset memory);

    function rentAt(uint256 _eNft, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory);

    function protocolFeeFor(address _token)
        external
        view
        returns (LibReward.Reward memory);

    function assetRewardFor(uint256 _eNft, address _token)
        external
        view
        returns (LibReward.Reward memory);
}
