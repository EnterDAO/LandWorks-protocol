// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721WithSetUpdateOperatorMock is IERC721, ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter internal _total;

    constructor() ERC721("ERC721Mock", "MOCK-ERC721") {}

    function mint(address _to, uint256 _tokenId) public {
        _safeMint(_to, _tokenId);
    }

    function setUpdateOperator(uint256 _tokenId, address operator) public {}
}
