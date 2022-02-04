// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./interfaces/IDiamondCut.sol";
import "./interfaces/IDiamondLoupe.sol";
import "./interfaces/IERC173.sol";
import "./interfaces/IERC721Consumable.sol";
import "./interfaces/IERC721Facet.sol";
import "./interfaces/IFeeFacet.sol";
import "./interfaces/decentraland/IDecentralandFacet.sol";
import "./interfaces/IMarketplaceFacet.sol";
import "./interfaces/IMetaverseConsumableAdapterFacet.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IRentPayout.sol";

/// @notice LandWorks Diamond Interface. Encapsulates all methods supported by LandWorks Diamond
interface ILandWorks is
    IDiamondCut,
    IDiamondLoupe,
    IERC165,
    IERC173,
    IERC721Consumable,
    IERC721Facet,
    IFeeFacet,
    IMarketplaceFacet,
    IDecentralandFacet,
    IRentPayout,
    IMetaverseConsumableAdapterFacet
{
    /// @notice Initialises the ERC721's name, symbol and base URI.
    /// @param _name The target name
    /// @param _symbol The target symbol
    /// @param _baseURI The target base URI
    function initERC721(
        string memory _name,
        string memory _symbol,
        string memory _baseURI
    ) external;
}
