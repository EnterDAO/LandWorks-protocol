// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/ILandWorksNFT.sol";

contract LandWorksNFT is ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter internal _total;

    constructor() ERC721("LandWorks NFT", "eNFT") {}

    /// @dev Mints token to beneficiary
    function mint(address _beneficiary) public onlyOwner returns (uint256) {
        uint256 tokenId = _total.current();

        _total.increment();
        _mint(_beneficiary, tokenId);

        return tokenId;
    }

    /// @dev Returns whether the spender is allowed to manage `tokenId`
    function isApprovedOrOwner(address _spender, uint256 _tokenId)
        public
        view
        returns (bool)
    {
        return _isApprovedOrOwner(_spender, _tokenId);
    }
}
