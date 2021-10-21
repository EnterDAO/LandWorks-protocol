// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../interfaces/decentraland/IDecentralandFacet.sol";
import "../../interfaces/decentraland/IDecentralandRegistry.sol";
import "../../libraries/LibOwnership.sol";
import "../../libraries/marketplace/LibRent.sol";
import "../../libraries/marketplace/LibDecentraland.sol";

contract DecentralandFacet is IDecentralandFacet {
    /// @notice Rents Decentraland Estate/LAND.
    /// @param _eNft The target eNft loan
    /// @param _period The target period of the rental
    /// @param _operator The target operator, which will be set as operator once the rent is active
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

    /// @notice Updates the corresponding Estate/LAND operator from the given rent.
    /// When the rent becomes active (the current block.number is between the rent's start and end),
    /// this function is executed to set the provided rent operator to the Estate/LAND scene operator.
    /// @param _eNft The target eNft which will map to its corresponding Estate/LAND
    /// @param _rentId The target rent
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

    /// @notice Updates the corresponding Estate/LAND operator with the administrative operator
    /// @param _eNft The target eNft which will map to its corresponding Estate/LAND
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

    /// @notice Updates the operator for the given renf of an eNft
    /// @param _eNft The target eNft
    /// @param _rentId The target rentId to the eNft
    /// @param _newOperator The to-be-set new operator
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

    /// @notice Updates the administrative operator
    /// @param _administrativeOperator The to-be-set administrative operator
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

    /// @notice Gets the administrative operator
    function administrativeOperator() external view returns (address) {
        return LibDecentraland.administrativeOperator();
    }

    /// @notice Gets the operator of the rent for the an eNft
    /// @param _eNft The target eNft
    /// @param _rentId The target rentId
    function operatorFor(uint256 _eNft, uint256 _rentId)
        external
        view
        returns (address)
    {
        return LibDecentraland.operatorFor(_eNft, _rentId);
    }
}
