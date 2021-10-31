// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../interfaces/IMarketplaceFacet.sol";
import "../libraries/LibERC721.sol";
import "../libraries/LibClaim.sol";
import "../libraries/LibFee.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibRent.sol";

contract MarketplaceFacet is IMarketplaceFacet, ERC721Holder {
    /// @notice Provides land of the given metaverse registry
    /// Transfers and locks the provided metaverse land to the contract
    /// and mints an eNft, representing the locked land.
    /// @param _metaverseId The id of the metaverse
    /// @param _metaverseRegistry The registry of the metaverse
    /// @param _metaverseAssetId The id from the metaverse registry
    /// @param _minPeriod The minimum number of blocks the land can be rented
    /// @param _maxPeriod The maximum number of blocks the land can be rented
    /// @param _maxFutureBlock The block delta after which the protocol will not allow
    /// the land to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0 for ETH
    /// @param _pricePerBlock The price for rental per block
    function list(
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external {
        require(
            _metaverseRegistry != address(0),
            "_metaverseRegistry must not be 0x0"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureBlock,
            "_maxPeriod more than _maxFutureBlock"
        );
        require(
            LibMarketplace.supportsRegistry(_metaverseId, _metaverseRegistry),
            "_registry not supported"
        );
        enforceIsValidToken(_paymentToken);

        IERC721(_metaverseRegistry).safeTransferFrom(
            msg.sender,
            address(this),
            _metaverseAssetId
        );

        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        uint256 eNft = LibERC721.safeMint(msg.sender);

        LibMarketplace.Asset storage asset = ms.assets[eNft];

        asset.metaverseId = _metaverseId;
        asset.metaverseRegistry = _metaverseRegistry;
        asset.metaverseAssetId = _metaverseAssetId;
        asset.paymentToken = _paymentToken;
        asset.minPeriod = _minPeriod;
        asset.maxPeriod = _maxPeriod;
        asset.maxFutureBlock = _maxFutureBlock;
        asset.pricePerBlock = _pricePerBlock;

        emit List(
            eNft,
            _metaverseId,
            _metaverseRegistry,
            _metaverseAssetId,
            _minPeriod,
            _maxPeriod,
            _maxFutureBlock,
            _paymentToken,
            _pricePerBlock
        );
    }

    /// @notice Updates the lending conditions for a given eNft
    /// Pays out the current unclaimed rent fees to the caller.
    /// Updated conditions apply the next time the land is rented.
    /// Does not affect previous and queued rents
    /// If any of the old conditions do not want to be modified, the old ones must be provided
    /// @param _eNft The target eNft
    /// @param _minPeriod The minimum number of blocks the land can be rented
    /// @param _maxPeriod The maximum number of blocks the land can be rented
    /// @param _maxFutureBlock The block delta after which the protocol will not allow
    /// the land to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0 for ETH
    /// @param _pricePerBlock The price for rental per block
    function updateConditions(
        uint256 _eNft,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureBlock,
            "_maxPeriod more than _maxFutureBlock"
        );
        enforceIsValidToken(_paymentToken);

        LibMarketplace.Asset storage asset = ms.assets[_eNft];
        address oldPaymentToken = asset.paymentToken;

        asset.paymentToken = _paymentToken;
        asset.minPeriod = _minPeriod;
        asset.maxPeriod = _maxPeriod;
        asset.maxFutureBlock = _maxFutureBlock;
        asset.pricePerBlock = _pricePerBlock;

        uint256 rentFee = LibFee.claimRentFee(_eNft, oldPaymentToken);

        LibClaim.transferRentFee(_eNft, oldPaymentToken, msg.sender, rentFee);

        emit UpdateConditions(
            _eNft,
            _minPeriod,
            _maxPeriod,
            _maxFutureBlock,
            _paymentToken,
            _pricePerBlock
        );
    }

    /// @notice Removes the land represented by the eNft from the marketplace
    /// Pays out the current unclaimed rent fees to the caller.
    /// If there are no active rents:
    /// Burns the eNft and transfers the land represented by the eNft to the caller
    /// @param _eNft The target eNft
    function delist(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );

        LibMarketplace.Asset memory asset = ms.assets[_eNft];

        ms.assets[_eNft].status = LibMarketplace.AssetStatus.Delisted;

        emit Delist(_eNft, msg.sender);

        if (block.number >= ms.rents[_eNft][asset.totalRents].endBlock) {
            withdraw(_eNft, asset);
        }
    }

    /// @notice Withdraws the already delisted from marketplace eNft
    /// Burns the eNft and transfers the land represented by the eNft to the caller
    /// @param _eNft The target _eNft
    function withdraw(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            LibERC721.isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );
        LibMarketplace.Asset memory asset = ms.assets[_eNft];
        require(
            asset.status == LibMarketplace.AssetStatus.Delisted,
            "_eNft not delisted"
        );
        require(
            block.number >= ms.rents[_eNft][asset.totalRents].endBlock,
            "_eNft has an active rent"
        );

        withdraw(_eNft, asset);
    }

    /// @notice Rents eNft land for a given period
    /// Charges user for the rent upfront. Rent starts from the last rented block
    /// or from the current block of the transaction.
    /// @param _eNft The target eNft
    /// @param _period The target period the rent will be active
    function rent(uint256 _eNft, uint256 _period) external payable {
        LibRent.rent(_eNft, _period);
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

    /// @notice Gets all asset data for a specific eNft
    /// @param _eNft The target eNft
    function assetAt(uint256 _eNft)
        external
        view
        returns (LibMarketplace.Asset memory)
    {
        return LibMarketplace.assetAt(_eNft);
    }

    /// @notice Gets all data for a specific rent of an eNft
    /// @param _eNft The taget eNft
    /// @param _rentId The target rent
    function rentAt(uint256 _eNft, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory)
    {
        return LibMarketplace.rentAt(_eNft, _rentId);
    }

    function withdraw(uint256 _eNft, LibMarketplace.Asset memory asset)
        internal
    {
        delete LibMarketplace.marketplaceStorage().assets[_eNft];
        LibERC721.burn(_eNft);

        uint256 rentFee = LibFee.claimRentFee(_eNft, asset.paymentToken);
        LibClaim.transferRentFee(
            _eNft,
            asset.paymentToken,
            msg.sender,
            rentFee
        );

        IERC721(asset.metaverseRegistry).safeTransferFrom(
            address(this),
            msg.sender,
            asset.metaverseAssetId
        );

        emit Withdraw(_eNft, msg.sender);
    }

    function enforceIsValidToken(address _token) internal view {
        require(
            _token == address(0) || LibFee.supportsTokenPayment(_token),
            "token not supported"
        );
    }
}
