// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../libraries/LibMarketplace.sol";
import "../libraries/LibFee.sol";

interface IMarketplaceFacet {
    event List(
        uint256 _eNft,
        uint256 _metaverseId,
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
    event ClaimRentFee(
        uint256 _eNft,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetMetaverseName(uint256 _metaverseId, string _name);
    event SetRegistry(uint256 _metaverseId, address _registry, bool _status);

    function list(
        uint256 _metaverseId,
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

    function setMetaverseName(uint256 _metaverseId, string memory _name)
        external;

    function setRegistry(
        uint256 _metaverseId,
        address _registry,
        bool _status
    ) external;

    function supportsRegistry(uint256 _metaverseId, address _registry)
        external
        view
        returns (bool);

    function totalRegistries(uint256 _metaverseId)
        external
        view
        returns (uint256);

    function registryAt(uint256 _metaverseId, uint256 _index)
        external
        view
        returns (address);

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
        returns (LibFee.Fee memory);

    function assetRentFeesFor(uint256 _eNft, address _token)
        external
        view
        returns (LibFee.Fee memory);
}
