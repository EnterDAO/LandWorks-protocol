// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

library LibMarketplace {
    bytes32 constant MARKETPLACE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.marketplace");

    enum LoanStatus {
        Listed,
        Delisted
    }

    struct Loan {
        address contractAddress;
        uint256 tokenId;
        address paymentToken;
        uint256 minPeriod;
        uint256 maxPeriod;
        uint256 maxFutureBlock;
        uint256 pricePerBlock;
        uint256 totalRents;
        LoanStatus status;
    }

    struct Rent {
        address renter;
        uint256 startBlock;
        uint256 endBlock;
    }

    struct MarketplaceStorage {
        bool initialized;
        // Address of the LandWorks NFT
        address landWorksNft;
        // Loans
        mapping(uint256 => Loan) loans;
        // Rents
        mapping(uint256 => mapping(uint256 => Rent)) rents;
    }

    function marketplaceStorage()
        internal
        pure
        returns (MarketplaceStorage storage ms)
    {
        bytes32 position = MARKETPLACE_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }

    function addRent(
        uint256 _eNft,
        address _renter,
        uint256 _startBlock,
        uint256 _endBlock
    ) internal returns (uint256) {
        LibMarketplace.MarketplaceStorage storage ms = marketplaceStorage();
        uint256 newRentId = ms.loans[_eNft].totalRents + 1;

        ms.loans[_eNft].totalRents = newRentId;
        ms.rents[_eNft][ms.loans[_eNft].totalRents] = LibMarketplace.Rent({
            renter: _renter,
            startBlock: _startBlock,
            endBlock: _endBlock
        });

        return newRentId;
    }

    function landWorksNft() internal view returns (address) {
        return marketplaceStorage().landWorksNft;
    }

    function loanAt(uint256 _eNft) internal view returns (Loan memory) {
        return marketplaceStorage().loans[_eNft];
    }

    function rentAt(uint256 _eNft, uint256 _rentId)
        internal
        view
        returns (Rent memory)
    {
        return marketplaceStorage().rents[_eNft][_rentId];
    }
}
