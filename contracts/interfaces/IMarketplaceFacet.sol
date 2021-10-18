// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IMarketplaceFacet {
    event Add(
        uint256 _eNft,
        address _contract,
        uint256 _contractTokenId,
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
    event Remove(uint256 _eNft, address indexed _caller);
    event Withdraw(uint256 _eNft, address indexed _caller);
    event ClaimFee(address _token, address _recipient, uint256 _amount);
    event ClaimReward(
        uint256 _eNft,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetFee(address indexed _caller, uint256 _fee);
    event SetFeePrecision(address indexed _caller, uint256 _feePrecision);

    function initMarketplace(address _landWorksNft) external;

    function add(
        address _contract,
        uint256 _tokenId,
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

    function remove(uint256 _eNft) external;

    function withdraw(uint256 _eNft) external;

    function rent(uint256 _eNft, uint256 _period) external payable;

    function claimReward(uint256 _eNft) external;

    function claimFee(address _token) external;

    function setFee(uint256 _feePercentage) external;

    function setFeePrecision(uint256 _feePrecision) external;
}
