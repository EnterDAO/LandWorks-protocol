// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../interfaces/IMarketplaceFacet.sol";
import "../libraries/LibERC721.sol";
import "../libraries/LibTransfer.sol";
import "../libraries/LibFee.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibRent.sol";

contract MarketplaceFacet is IMarketplaceFacet, ERC721Holder {
    /// @notice Provides land of the given metaverse registry
    /// Transfers and locks the provided metaverse land to the contract
    /// and mints an asset, representing the locked land.
    /// @param _metaverseId The id of the metaverse
    /// @param _metaverseRegistry The registry of the metaverse
    /// @param _metaverseAssetId The id from the metaverse registry
    /// @param _minPeriod The minimum number of time (in seconds) the land can be rented
    /// @param _maxPeriod The maximum number of time (in seconds) the land can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the land to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0 for ETH
    /// @param _pricePerSecond The price for rental per second
    function list(
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    ) external {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry must not be 0x0"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureTime,
            "_maxPeriod more than _maxFutureTime"
        );
        require(
            LibMarketplace.supportsRegistry(_metaverseId, _metaverseRegistry),
            "_registry not supported"
        );
        enforceIsValidToken(_paymentToken);

        LibTransfer.erc721SafeTransferFrom(
            _metaverseRegistry,
            msg.sender,
            address(this),
            _metaverseAssetId
        );

        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        uint256 asset = LibERC721.safeMint(msg.sender);

        ms.assets[asset] = LibMarketplace.Asset({
            metaverseId: _metaverseId,
            metaverseRegistry: _metaverseRegistry,
            metaverseAssetId: _metaverseAssetId,
            paymentToken: _paymentToken,
            minPeriod: _minPeriod,
            maxPeriod: _maxPeriod,
            maxFutureTime: _maxFutureTime,
            pricePerSecond: _pricePerSecond,
            status: LibMarketplace.AssetStatus.Listed,
            totalRents: 0
        });

        emit List(
            asset,
            _metaverseId,
            _metaverseRegistry,
            _metaverseAssetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureTime,
            _paymentToken,
            _pricePerSecond
        );
    }

    /// @notice Updates the lending conditions for a given asset
    /// Pays out the current unclaimed rent fees to the caller.
    /// Updated conditions apply the next time the land is rented.
    /// Does not affect previous and queued rents
    /// If any of the old conditions do not want to be modified, the old ones must be provided
    /// @param _assetId The target asset
    /// @param _minPeriod The minimum number in seconds the land can be rented
    /// @param _maxPeriod The maximum number in seconds the land can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the land to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0 for ETH
    /// @param _pricePerSecond The price for rental per second
    function updateConditions(
        uint256 _assetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    ) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _assetId),
            "caller must be approved or owner of _assetId"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureTime,
            "_maxPeriod more than _maxFutureTime"
        );
        enforceIsValidToken(_paymentToken);

        LibMarketplace.Asset storage asset = ms.assets[_assetId];
        address oldPaymentToken = asset.paymentToken;

        asset.paymentToken = _paymentToken;
        asset.minPeriod = _minPeriod;
        asset.maxPeriod = _maxPeriod;
        asset.maxFutureTime = _maxFutureTime;
        asset.pricePerSecond = _pricePerSecond;

        uint256 rentFee = LibFee.claimRentFee(_assetId, oldPaymentToken);

        transferRentFee(_assetId, oldPaymentToken, msg.sender, rentFee);

        emit UpdateConditions(
            _assetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureTime,
            _paymentToken,
            _pricePerSecond
        );
    }

    /// @notice Removes the land represented by the asset from the marketplace
    /// Pays out the current unclaimed rent fees to the caller.
    /// If there are no active rents:
    /// Burns the asset and transfers the land represented by the asset to the caller
    /// @param _assetId The target asset
    function delist(uint256 _assetId) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _assetId),
            "caller must be approved or owner of _assetId"
        );

        LibMarketplace.Asset memory asset = ms.assets[_assetId];

        ms.assets[_assetId].status = LibMarketplace.AssetStatus.Delisted;

        emit Delist(_assetId, msg.sender);

        if (block.timestamp >= ms.rents[_assetId][asset.totalRents].end) {
            withdraw(_assetId, asset);
        }
    }

    /// @notice Withdraws the already delisted from marketplace asset
    /// Burns the asset and transfers the land represented by the asset to the caller
    /// @param _assetId The target _assetId
    function withdraw(uint256 _assetId) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _assetId),
            "caller must be approved or owner of _assetId"
        );
        LibMarketplace.Asset memory asset = ms.assets[_assetId];
        require(
            asset.status == LibMarketplace.AssetStatus.Delisted,
            "_assetId not delisted"
        );
        require(
            block.timestamp >= ms.rents[_assetId][asset.totalRents].end,
            "_assetId has an active rent"
        );

        withdraw(_assetId, asset);
    }

    /// @notice Rents asset land for a given period
    /// Charges user for the rent upfront. Rent starts from the last rented timestamp
    /// or from the current timestamp of the transaction.
    /// @param _assetId The target asset
    /// @param _period The target period the rent will be active
    function rent(uint256 _assetId, uint256 _period) external payable {
        LibRent.rent(_assetId, _period);
    }

    /// @notice Sets name to Metaverse
    /// @param _metaverseId The target metaverse
    /// @param _name Name of the metaverse
    function setMetaverseName(uint256 _metaverseId, string memory _name)
        external
    {
        LibOwnership.enforceIsContractOwner();
        LibMarketplace.setMetaverseName(_metaverseId, _name);

        emit SetMetaverseName(_metaverseId, _name);
    }

    /// @notice Sets Metaverse registry to a metaverse
    /// @param _metaverseId The target metaverse
    /// @param _registry The registry to be set
    /// @param _status Whether the registry will be added/removed
    function setRegistry(
        uint256 _metaverseId,
        address _registry,
        bool _status
    ) external {
        require(_registry != address(0), "_registy must not be 0x0");
        LibOwnership.enforceIsContractOwner();

        LibMarketplace.setRegistry(_metaverseId, _registry, _status);

        emit SetRegistry(_metaverseId, _registry, _status);
    }

    /// @notice Gets the name of the metaverse
    /// @param _metaverseId The target metaverse
    function metaverseName(uint256 _metaverseId)
        external
        view
        returns (string memory)
    {
        return LibMarketplace.metaverseName(_metaverseId);
    }

    /// @notice Get whether the registry is supported for a metaverse
    /// @param _metaverseId The target metaverse
    /// @param _registry The target registry
    function supportsRegistry(uint256 _metaverseId, address _registry)
        external
        view
        returns (bool)
    {
        return LibMarketplace.supportsRegistry(_metaverseId, _registry);
    }

    /// @notice Gets the total amount of registries for a metaverse
    /// @param _metaverseId The target metaverse
    function totalRegistries(uint256 _metaverseId)
        external
        view
        returns (uint256)
    {
        return LibMarketplace.totalRegistries(_metaverseId);
    }

    /// @notice Gets a metaverse registry at a given index
    /// @param _metaverseId The target metaverse
    /// @param _index The target index
    function registryAt(uint256 _metaverseId, uint256 _index)
        external
        view
        returns (address)
    {
        return LibMarketplace.registryAt(_metaverseId, _index);
    }

    /// @notice Gets all asset data for a specific asset
    /// @param _assetId The target asset
    function assetAt(uint256 _assetId)
        external
        view
        returns (LibMarketplace.Asset memory)
    {
        return LibMarketplace.assetAt(_assetId);
    }

    /// @notice Gets all data for a specific rent of an asset
    /// @param _assetId The taget asset
    /// @param _rentId The target rent
    function rentAt(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory)
    {
        return LibMarketplace.rentAt(_assetId, _rentId);
    }

    function withdraw(uint256 _assetId, LibMarketplace.Asset memory asset)
        internal
    {
        delete LibMarketplace.marketplaceStorage().assets[_assetId];
        LibERC721.burn(_assetId);

        uint256 rentFee = LibFee.claimRentFee(_assetId, asset.paymentToken);
        transferRentFee(_assetId, asset.paymentToken, msg.sender, rentFee);

        LibTransfer.erc721SafeTransferFrom(
            asset.metaverseRegistry,
            address(this),
            msg.sender,
            asset.metaverseAssetId
        );

        emit Withdraw(_assetId, msg.sender);
    }

    function transferRentFee(
        uint256 _assetId,
        address _token,
        address _receiver,
        uint256 _amount
    ) internal {
        LibTransfer.safeTransfer(_token, _receiver, _amount);
        emit ClaimRentFee(_assetId, _token, _receiver, _amount);
    }

    function enforceIsValidToken(address _token) internal view {
        require(
            _token == address(0) || LibFee.supportsTokenPayment(_token),
            "token not supported"
        );
    }
}
