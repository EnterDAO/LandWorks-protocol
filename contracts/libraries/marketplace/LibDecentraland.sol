// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

library LibDecentraland {
    bytes32 constant DECENTRALAND_MARKETPLACE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.marketplace.decentraland");

    struct DecentralandStorage {
        // Administrative Operator to Estate/LANDs, when no rents are active
        address administrativeOperator;
        // Stores the operators for each eNft's rentals
        mapping(uint256 => mapping(uint256 => address)) operators;
    }

    function decentralandStorage()
        internal
        pure
        returns (DecentralandStorage storage ds)
    {
        bytes32 position = DECENTRALAND_MARKETPLACE_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function setOperator(
        uint256 _eNft,
        uint256 _rentId,
        address _operator
    ) internal {
        decentralandStorage().operators[_eNft][_rentId] = _operator;
    }

    function setAdministrativeOperator(address _administrativeOperator)
        internal
    {
        decentralandStorage().administrativeOperator = _administrativeOperator;
    }

    function administrativeOperator() internal view returns (address) {
        return decentralandStorage().administrativeOperator;
    }

    function operatorFor(uint256 _eNft, uint256 _rentId)
        internal
        view
        returns (address)
    {
        return decentralandStorage().operators[_eNft][_rentId];
    }
}
