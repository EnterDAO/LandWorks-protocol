// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../interfaces/ILandWorksNFT.sol";
import "../interfaces/IMarketplaceFacet.sol";
import "../libraries/LibGovernance.sol";
import "../libraries/LibMarketplace.sol";
import "../libraries/LibOwnership.sol";
import "../libraries/marketplace/LibRent.sol";

contract MarketplaceFacet is IMarketplaceFacet, ERC721Holder {
    using SafeERC20 for IERC20;

    function initMarketplace(address _landWorksNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(!ms.initialized, "MarketplaceStorage already initialized");
        require(_landWorksNft != address(0), "landWorksNft must not be 0x0");

        ms.initialized = true;
        ms.landWorksNft = _landWorksNft;
    }

    // TODO: extract params in calldata?
    function add(
        address _contract,
        uint256 _tokenId,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external {
        require(_contract != address(0), "_contract must not be 0x0");
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureBlock,
            "_maxPeriod more than _maxFutureBlock"
        );
        require(
            LibGovernance.supportsRegistry(_contract),
            "_registry not supported"
        );
        enforceIsValidToken(_paymentToken);

        IERC721(_contract).transferFrom(msg.sender, address(this), _tokenId);

        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();

        uint256 eNft = ILandWorksNFT(ms.landWorksNft).mint(msg.sender);

        LibMarketplace.Loan storage loan = ms.loans[eNft];
        loan.contractAddress = _contract;
        loan.tokenId = _tokenId;
        loan.paymentToken = _paymentToken;
        loan.minPeriod = _minPeriod;
        loan.maxPeriod = _maxPeriod;
        loan.maxFutureBlock = _maxFutureBlock;
        loan.pricePerBlock = _pricePerBlock;

        emit Add(
            eNft,
            _contract,
            _tokenId,
            _minPeriod,
            _maxPeriod,
            _maxFutureBlock,
            _paymentToken,
            _pricePerBlock
        );
    }

    // TODO: extract input params as calldata struct?
    function updateConditions(
        uint256 _eNft,
        uint256 _minPeriod,
        uint256 _maxPeriod,
        uint256 _maxFutureBlock,
        address _paymentToken,
        uint256 _pricePerBlock
    ) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );
        require(_minPeriod != 0, "_minPeriod must not be 0");
        require(_maxPeriod != 0, "_maxPeriod must not be 0");
        require(_minPeriod <= _maxPeriod, "_minPeriod more than _maxPeriod");
        require(
            _maxPeriod <= _maxFutureBlock,
            "_maxPeriod more than _maxFutureBlock"
        );
        enforceIsValidToken(_paymentToken);

        LibMarketplace.Loan storage loan = ms.loans[_eNft];
        address oldPaymentToken = loan.paymentToken;

        loan.paymentToken = _paymentToken;
        loan.minPeriod = _minPeriod;
        loan.maxPeriod = _maxPeriod;
        loan.pricePerBlock = _pricePerBlock;

        uint256 amount = LibReward.claimReward(_eNft, oldPaymentToken);

        claimReward(_eNft, oldPaymentToken, msg.sender, amount);

        emit UpdateConditions(
            _eNft,
            _minPeriod,
            _maxPeriod,
            _maxFutureBlock,
            _paymentToken,
            _pricePerBlock
        );
    }

    function remove(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );

        LibMarketplace.Loan memory loan = ms.loans[_eNft];
        uint256 amount = LibReward.claimReward(_eNft, loan.paymentToken);

        ms.loans[_eNft].status = LibMarketplace.LoanStatus.Delisted;

        if (block.number > ms.rents[_eNft][loan.totalRents].endBlock) {
            delete ms.loans[_eNft];
            ILandWorksNFT(ms.landWorksNft).burn(_eNft);
            IERC721(loan.contractAddress).safeTransferFrom(
                address(this),
                msg.sender,
                loan.tokenId
            );

            emit Withdraw(_eNft, msg.sender);
        }

        claimReward(_eNft, loan.contractAddress, msg.sender, amount);

        emit Remove(_eNft, msg.sender);
    }

    function withdraw(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of _eNft"
        );
        LibMarketplace.Loan memory loan = ms.loans[_eNft];
        require(
            loan.status == LibMarketplace.LoanStatus.Delisted,
            "_eNft not delisted"
        );
        require(
            block.number > ms.rents[_eNft][loan.totalRents].endBlock,
            "_eNft has an active rent"
        );

        delete ms.loans[_eNft];
        ILandWorksNFT(ms.landWorksNft).burn(_eNft);
        IERC721(loan.contractAddress).safeTransferFrom(
            address(this),
            msg.sender,
            loan.tokenId
        );

        emit Withdraw(_eNft, msg.sender);
    }

    function rent(uint256 _eNft, uint256 _period) external payable {
        LibRent.rent(_eNft, _period);
    }

    function claimReward(uint256 _eNft) external {
        LibMarketplace.MarketplaceStorage storage ms = LibMarketplace
            .marketplaceStorage();
        require(
            ILandWorksNFT(ms.landWorksNft).isApprovedOrOwner(msg.sender, _eNft),
            "caller must be approved or owner of eNft"
        );

        address paymentToken = ms.loans[_eNft].paymentToken;
        uint256 amount = LibReward.claimReward(_eNft, paymentToken);

        claim(paymentToken, msg.sender, amount);
    }

    function claimFee(address _token) external {
        LibOwnership.enforceIsContractOwner();

        uint256 amount = LibReward.claimFee(_token);

        claim(_token, msg.sender, amount);

        emit ClaimFee(_token, msg.sender, amount);
    }

    function setFee(uint256 _feePercentage) external {
        LibOwnership.enforceIsContractOwner();
        LibReward.setFeePercentage(_feePercentage);
        emit SetFee(msg.sender, _feePercentage);
    }

    function setFeePrecision(uint256 _feePrecision) external {
        LibOwnership.enforceIsContractOwner();
        require(_feePrecision >= 10, "_feePrecision must not be single-digit");
        LibReward.setFeePrecision(_feePrecision);
        emit SetFeePrecision(msg.sender, _feePrecision);
    }

    function claimReward(
        uint256 _eNft,
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        claim(_token, _recipient, _amount);
        emit ClaimReward(_eNft, _token, _recipient, _amount);
    }

    function claim(
        address _token,
        address _recipient,
        uint256 _amount
    ) internal {
        if (_amount != 0) {
            if (_token == address(0)) {
                payable(_recipient).transfer(_amount);
            } else {
                IERC20(_token).safeTransfer(_recipient, _amount);
            }
        }
    }

    function enforceIsValidToken(address _token) internal view {
        require(
            _token == address(0) || LibGovernance.supportsTokenPayment(_token),
            "token not supported"
        );
    }
}
