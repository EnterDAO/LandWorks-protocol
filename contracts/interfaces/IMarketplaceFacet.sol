// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../libraries/LibMarketplace.sol";

interface IMarketplaceFacet {
    event List(
        uint256 _assetId,
        uint256 _metaverseId,
        address _metaverseRegistry,
        uint256 _metaverseAssetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    );
    event UpdateConditions(
        uint256 _assetId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureTime,
        address _paymentToken,
        uint256 _pricePerSecond
    );
    event Rent(
        uint256 indexed _assetId,
        uint256 _rentId,
        address indexed _renter,
        uint256 _start,
        uint256 _end,
        uint256 _fee
    );
    event Delist(uint256 _assetId, address indexed _caller);
    event Withdraw(uint256 _assetId, address indexed _caller);
    event ClaimRentFee(
        uint256 _assetId,
        address _token,
        address indexed _recipient,
        uint256 _amount
    );
    event SetMetaverseName(uint256 _metaverseId, string _name);
    event SetRegistry(uint256 _metaverseId, address _registry, bool _status);

    /// @notice Provides asset of the given metaverse registry for rental.
    /// Transfers and locks the provided metaverse asset to the contract.
    /// and mints an asset, representing the locked asset.
    /// @param _metaverseId The id of the metaverse
    /// @param _metaverseRegistry The registry of the metaverse
    /// @param _metaverseAssetId The id from the metaverse registry
    /// @param _minPeriod The minimum number of time (in seconds) the asset can be rented
    /// @param _maxPeriod The maximum number of time (in seconds) the asset can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the asset to be rented at an any given moment.
    /// @param _paymentToken The token which will be accepted as a form of payment.
    /// Provide 0x0 for ETH.
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
    ) external;

    /// @notice Updates the lending conditions for a given asset.
    /// Pays out the unclaimed rent fees to the caller.
    /// Updated conditions apply the next time the asset is rented.
    /// Does not affect previous and queued rents.
    /// If any of the old conditions do not want to be modified, the old ones must be provided.
    /// @param _assetId The target asset
    /// @param _minPeriod The minimum number in seconds the asset can be rented
    /// @param _maxPeriod The maximum number in seconds the asset can be rented
    /// @param _maxFutureTime The timestamp delta after which the protocol will not allow
    /// the asset to be rented at an any given moment.
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
    ) external;

    /// @notice Delists the asset from the marketplace.
    /// If there are no active rents:
    /// Burns the asset and transfers the original metaverse asset represented by the asset to the caller.
    /// Pays out the current unclaimed rent fees to the caller.
    /// @param _assetId The target asset
    function delist(uint256 _assetId) external;

    /// @notice Withdraws the already delisted from marketplace asset.
    /// Burns the asset and transfers the original metaverse asset represented by the asset to the caller.
    /// Pays out the current unclaimed rent fees to the caller.
    /// @param _assetId The target _assetId
    function withdraw(uint256 _assetId) external;

    /// @notice Rents an asset for a given period.
    /// Charges user for the rent upfront. Rent starts from the last rented timestamp
    /// or from the current timestamp of the transaction.
    /// @param _assetId The target asset
    /// @param _period The target rental period (in seconds)
    function rent(uint256 _assetId, uint256 _period) external payable;

    /// @notice Sets name for a given Metaverse.
    /// @param _metaverseId The target metaverse
    /// @param _name Name of the metaverse
    function setMetaverseName(uint256 _metaverseId, string memory _name)
        external;

    /// @notice Sets Metaverse registry to a Metaverse
    /// @param _metaverseId The target metaverse
    /// @param _registry The registry to be set
    /// @param _status Whether the registry will be added/removed
    function setRegistry(
        uint256 _metaverseId,
        address _registry,
        bool _status
    ) external;

    /// @notice Gets the name of the Metaverse
    /// @param _metaverseId The target metaverse
    function metaverseName(uint256 _metaverseId)
        external
        view
        returns (string memory);

    /// @notice Get whether the registry is supported for a metaverse
    /// @param _metaverseId The target metaverse
    /// @param _registry The target registry
    function supportsRegistry(uint256 _metaverseId, address _registry)
        external
        view
        returns (bool);

    /// @notice Gets the total amount of registries for a metaverse
    /// @param _metaverseId The target metaverse
    function totalRegistries(uint256 _metaverseId)
        external
        view
        returns (uint256);

    /// @notice Gets a metaverse registry at a given index
    /// @param _metaverseId The target metaverse
    /// @param _index The target index
    function registryAt(uint256 _metaverseId, uint256 _index)
        external
        view
        returns (address);

    /// @notice Gets all asset data for a specific asset
    /// @param _assetId The target asset
    function assetAt(uint256 _assetId)
        external
        view
        returns (LibMarketplace.Asset memory);

    /// @notice Gets all data for a specific rent of an asset
    /// @param _assetId The taget asset
    /// @param _rentId The target rent
    function rentAt(uint256 _assetId, uint256 _rentId)
        external
        view
        returns (LibMarketplace.Rent memory);
}
