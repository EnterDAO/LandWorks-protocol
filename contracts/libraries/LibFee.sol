// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library LibFee {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 constant FEE_STORAGE_POSITION =
        keccak256("com.enterdao.landworks.fee");

    event SetTokenPayment(address _token, bool _status);
    event SetFee(address _token, uint256 _fee);

    struct Fee {
        uint256 paidAmount;
        uint256 accumulatedAmount;
    }

    struct FeeStorage {
        // Supported tokens as a form of payment
        EnumerableSet.AddressSet tokenPayments;
        // Protocol fee percentages for tokens
        mapping(address => uint256) feePercentages;
        // Asset owners' rent fees
        mapping(uint256 => mapping(address => Fee)) assetRentFees;
        // Protocol fees
        mapping(address => Fee) protocolFees;
        // Protocol fee precision
        uint256 feePrecision;
    }

    function feeStorage() internal pure returns (FeeStorage storage fs) {
        bytes32 position = FEE_STORAGE_POSITION;

        assembly {
            fs.slot := position
        }
    }

    function distributeFees(
        uint256 _assetId,
        address _token,
        uint256 _amount
    ) internal {
        LibFee.FeeStorage storage fs = feeStorage();

        uint256 protocolFee = (_amount * fs.feePercentages[_token]) /
            fs.feePrecision;

        uint256 rentFee = _amount - protocolFee;
        fs.assetRentFees[_assetId][_token].accumulatedAmount += rentFee;
        fs.protocolFees[_token].accumulatedAmount += protocolFee;
    }

    function claimRentFee(uint256 _assetId, address _token)
        internal
        returns (uint256)
    {
        LibFee.Fee storage fees = feeStorage().assetRentFees[_assetId][_token];

        uint256 transferAmount = fees.accumulatedAmount - fees.paidAmount;
        fees.paidAmount = fees.accumulatedAmount;

        return transferAmount;
    }

    function claimProtocolFee(address _token) internal returns (uint256) {
        LibFee.Fee storage fees = feeStorage().protocolFees[_token];

        uint256 transferAmount = fees.accumulatedAmount - fees.paidAmount;
        fees.paidAmount = fees.accumulatedAmount;

        return transferAmount;
    }

    function setFeePercentage(address _token, uint256 _feePercentage) internal {
        LibFee.FeeStorage storage fs = feeStorage();
        require(
            _feePercentage < fs.feePrecision,
            "_feePercentage exceeds or equal to feePrecision"
        );
        fs.feePercentages[_token] = _feePercentage;

        emit SetFee(_token, _feePercentage);
    }

    function setFeePrecision(uint256 _feePrecision) internal {
        feeStorage().feePrecision = _feePrecision;
    }

    function setTokenPayment(address _token, bool _status) internal {
        FeeStorage storage fs = feeStorage();
        if (_status) {
            require(fs.tokenPayments.add(_token), "_token already added");
        } else {
            require(fs.tokenPayments.remove(_token), "_token not found");
        }

        emit SetTokenPayment(_token, _status);
    }

    function supportsTokenPayment(address _token) internal view returns (bool) {
        return feeStorage().tokenPayments.contains(_token);
    }

    function totalTokenPayments() internal view returns (uint256) {
        return feeStorage().tokenPayments.length();
    }

    function tokenPaymentAt(uint256 _index) internal view returns (address) {
        return feeStorage().tokenPayments.at(_index);
    }

    function protocolFeeFor(address _token) internal view returns (Fee memory) {
        return feeStorage().protocolFees[_token];
    }

    function assetRentFeesFor(uint256 _assetId, address _token)
        internal
        view
        returns (Fee memory)
    {
        return feeStorage().assetRentFees[_assetId][_token];
    }

    function feePercentage(address _token) internal view returns (uint256) {
        return feeStorage().feePercentages[_token];
    }

    function feePrecision() internal view returns (uint256) {
        return feeStorage().feePrecision;
    }
}
