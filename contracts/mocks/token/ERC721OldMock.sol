// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../../interfaces/IERC721OldReceiver.sol";

contract ERC721OldMock is ERC721 {
    using Address for address;
    using Counters for Counters.Counter;

    Counters.Counter internal _total;

    constructor() ERC721("ERC721OldMock", "MOCK-ERC721Old") {}

    function mint(address _to, uint256 _tokenId) public {
        _safeMint(_to, _tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        _transfer(from, to, tokenId);
        require(
            _checkOnERC721Received(from, to, tokenId),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Internal function to invoke {IERC721OldReceiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId
    ) private returns (bool) {
        if (to.isContract()) {
            try
                IERC721OldReceiver(to).onERC721Received(from, tokenId, "")
            returns (bytes4 retval) {
                return retval == IERC721OldReceiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                revert("ERC721: transfer to non ERC721OldHolder implementer");
            }
        } else {
            return true;
        }
    }
}
