// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../interfaces/decentraland/IDecentralandFacet.sol";
import "../../interfaces/decentraland/IDecentralandRegistry.sol";
import "../../libraries/LibOwnership.sol";
import "../../libraries/marketplace/LibRent.sol";
import "../../libraries/marketplace/LibDecentraland.sol";

contract DecentralandFacet is IDecentralandFacet {
    function rentDecentraland(
        uint256 _eNft,
        uint256 _period,
        address _operator
    ) external payable {
        require(_operator != address(0), "_operator must not be 0x0");
        uint256 rentId = LibRent.rent(_eNft, _period);

        LibDecentraland.setOperator(_eNft, rentId, _operator);

        emit RentDecentraland(_eNft, rentId, _operator);
    }

    function updateState(uint256 _eNft, uint256 _rentId) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).ownerOf(_eNft) != address(0),
            "_eNft not found"
        );
        LibMarketplace.Rent memory rent = ms.rents[_eNft][_rentId];

        require(
            block.number >= rent.startBlock,
            "block number less than rent start"
        );
        require(
            block.number < rent.endBlock,
            "block number more than or equal to rent end"
        );

        LibMarketplace.Loan memory loan = ms.loans[_eNft];
        address operator = LibDecentraland.decentralandStorage().operators[
            _eNft
        ][_rentId];

        IDecentralandRegistry(loan.contractAddress).setUpdateOperator(
            loan.tokenId,
            operator
        );

        emit UpdateState(_eNft, _rentId, operator);
    }

    function updateAdministrativeState(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).ownerOf(_eNft) != address(0),
            "_eNft not found"
        );
        LibMarketplace.Loan memory loan = ms.loans[_eNft];

        require(
            block.number > ms.rents[_eNft][loan.totalRents].endBlock,
            "_eNft has an active rent"
        );

        address operator = LibDecentraland
            .decentralandStorage()
            .administrativeOperator;
        IDecentralandRegistry(loan.contractAddress).setUpdateOperator(
            loan.tokenId,
            operator
        );
        emit UpdateAdministrativeState(_eNft, operator);
    }

    function updateOperator(
        uint256 _eNft,
        uint256 _rentId,
        address _newOperator
    ) external {
        require(_newOperator != address(0), "operator must not be 0x0");
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).ownerOf(_eNft) != address(0),
            "_eNft not found"
        );

        require(
            msg.sender == ms.rents[_eNft][_rentId].renter,
            "caller is not renter"
        );
        LibDecentraland.setOperator(_eNft, _rentId, _newOperator);

        emit UpdateOperator(_eNft, _rentId, _newOperator);
    }

    function updateAdministrativeOperator(address _administrativeOperator)
        external
    {
        require(
            _administrativeOperator != address(0),
            "operator must not be 0x0"
        );
        LibOwnership.enforceIsContractOwner();

        LibDecentraland.setAdministrativeOperator(_administrativeOperator);

        emit UpdateAdministrativeOperator(_administrativeOperator);
    }

    function administrativeOperator() external view returns (address) {
        return LibDecentraland.administrativeOperator();
    }

    function operatorFor(uint256 _eNft, uint256 _rentId)
        external
        view
        returns (address)
    {
        return LibDecentraland.operatorFor(_eNft, _rentId);
    }
}
