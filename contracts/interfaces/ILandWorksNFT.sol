// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILandWorksNFT is IERC721 {
    function mint(address _beneficiary) external returns (uint256);

    function burn(uint256 _tokenId) external;

    function isApprovedOrOwner(address _spender, uint256 _tokenId)
        external
        returns (bool);
}
