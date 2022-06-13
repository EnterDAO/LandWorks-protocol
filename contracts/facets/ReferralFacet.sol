// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IReferralAdapterV1.sol";
import "../interfaces/IReferralFacet.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/LibReferral.sol";
import "../libraries/LibTransfer.sol";

contract ReferralFacet is IReferralFacet {
    function setReferralAdapter(address _referralAdapter) external {
        require(
            _referralAdapter != address(0),
            "_referralAdapter must not be 0x0"
        );
        LibOwnership.enforceIsContractOwner();
        LibReferral.referralStorage().referralAdapter = IReferralAdapterV1(
            _referralAdapter
        );

        emit SetReferralAdapter(_referralAdapter);
    }

    function claimReferralFee(address _paymentToken)
        public
        returns (address token_, uint256 amount_)
    {
        LibReferral.ReferralStorage storage rs = LibReferral.referralStorage();
        uint256 amount = rs.referralFees[msg.sender][_paymentToken];
        require(amount > 0, "amount cannot be zero");
        rs.referralFees[msg.sender][_paymentToken] = 0;

        LibTransfer.safeTransfer(_paymentToken, msg.sender, amount);

        emit ClaimReferralFee(msg.sender, _paymentToken, amount);

        return (_paymentToken, amount);
    }

    function claimMultipleReferralFees(address[] memory _tokens) external {
        for (uint256 i = 0; i < _tokens.length; i++) {
            claimReferralFee(_tokens[i]);
        }
    }

    function referralFee(address _referrer, address _token)
        external
        view
        returns (uint256 amount_)
    {
        return LibReferral.referralStorage().referralFees[_referrer][_token];
    }
}
