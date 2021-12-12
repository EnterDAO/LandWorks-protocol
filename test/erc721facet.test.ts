import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { Diamond } from '../utils/diamond';
import { DecentralandFacet, DiamondCutFacet, DiamondLoupeFacet, Erc721Facet, FeeFacet, MarketplaceFacet, OwnershipFacet } from '../typechain';
import { Deployer } from "../utils/deployer";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('ERC721Facet', function () {
    let loupe: Contract, cut: Contract, ownership: Contract, marketplace: Contract, fee: Contract, erc721: Contract, decentraland: Contract, diamond: Contract;
    let loupeFacet: DiamondLoupeFacet, cutFacet: DiamondCutFacet, ownershipFacet: OwnershipFacet, marketplaceFacet: MarketplaceFacet, feeFacet: FeeFacet, erc721Facet: Erc721Facet, decentralandFacet: DecentralandFacet;
    let owner: SignerWithAddress, newOwner, approved: SignerWithAddress, anotherApproved: SignerWithAddress, operator: SignerWithAddress, consumer: SignerWithAddress, other: SignerWithAddress;
    let snapshotId: any;
    let mockERC721Registry: Contract;

    const ERC721_SYMBOL = 'LW';
    const ERC721_NAME = 'LandWorks';
    const ERC721_BASE_URI = 'ipfs://';
    const RECEIVER_MAGIC_VALUE = '0x150b7a02';

    const metaverseTokenId = 1;
    const minPeriod = 1;
    const maxPeriod = 100;
    const maxFutureTime = 120;
    const pricePerSecond = 1337;
    const metaverseId = 0;
    const tokenID = 0; // The first minted ERC721 Asset
    const data = '0x42';

    const ERROR_NONE = 0;
    const ERROR_REVERT_WITH_MESSAGE = 1;
    const ERROR_REVERT_WITHOUT_MESSAGE = 2;
    const ERROR_PANIC = 3;
    const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        newOwner = signers[1];
        approved = signers[2];
        anotherApproved = signers[3];
        operator = signers[4];
        consumer = signers[5];
        other = signers[6];

        cut = await Deployer.deployContract('DiamondCutFacet');
        loupe = await Deployer.deployContract('DiamondLoupeFacet');
        ownership = await Deployer.deployContract('OwnershipFacet');
        marketplace = await Deployer.deployContract('MarketplaceFacet');
        fee = await Deployer.deployContract('FeeFacet');
        decentraland = await Deployer.deployContract('DecentralandFacet');

        erc721 = await Deployer.deployContract('ERC721Facet');

        diamond = await Deployer.deployDiamond(
            'LandWorks',
            [cut, loupe, ownership, marketplace, fee, erc721, decentraland],
            owner.address,
        );

        loupeFacet = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
        cutFacet = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
        ownershipFacet = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
        marketplaceFacet = (await Diamond.asFacet(diamond, 'MarketplaceFacet')) as MarketplaceFacet;
        feeFacet = (await Diamond.asFacet(diamond, 'FeeFacet')) as FeeFacet;
        erc721Facet = (await Diamond.asFacet(diamond, 'ERC721Facet')) as Erc721Facet;
        decentralandFacet = (await Diamond.asFacet(diamond, 'DecentralandFacet')) as DecentralandFacet;
        // Enable ETH payments
        await feeFacet.setTokenPayment(ADDRESS_ONE, 0, true);

        // Init ERC721
        await erc721Facet.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI);

        mockERC721Registry = await Deployer.deployContract('ERC721Mock');
        await mockERC721Registry.mint(owner.address, metaverseTokenId);
        // and:
        await marketplaceFacet.setRegistry(metaverseId, mockERC721Registry.address, true);
        // and:
        await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);
        // and:
        await marketplaceFacet.list(
            metaverseId,
            mockERC721Registry.address,
            metaverseTokenId,
            minPeriod,
            maxPeriod,
            maxFutureTime,
            ADDRESS_ONE,
            pricePerSecond);
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot', []);
    });

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should have initialised symbols successfully', async () => {
        expect(await erc721Facet.symbol()).to.equal(ERC721_SYMBOL);
    });

    it('should have initialised name successfully', async () => {
        expect(await erc721Facet.name()).to.equal(ERC721_NAME);
    });

    it('should have initialised base URI successfully', async () => {
        expect(await erc721Facet.baseURI()).to.equal(ERC721_BASE_URI);
    });

    it('should revert when already initialized', async () => {
        const expectedRevertMessage = 'ERC721 Storage already initialized';
        await expect(erc721Facet.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI))
            .to.be.revertedWith(expectedRevertMessage);
    });

    describe('balanceOf', async () => {
        it('should have proper balance', async () => {
            expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
        });

        it('should revert when owner is 0x0', async () => {
            const expectedRevertMessage = 'ERC721: balance query for the zero address';

            await expect(erc721Facet.balanceOf(ethers.constants.AddressZero))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('ownerOf', async () => {
        it('should return the proper owner of the tokenID', async () => {
            expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
        });

        it('should revert when token ID is nonexistent', async () => {
            const invalidTokenId = 2;
            const expectedRevertMessage = 'ERC721: owner query for nonexistent token';
            await expect(erc721Facet.ownerOf(invalidTokenId))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('getApproved', async () => {
        it('should return approved', async () => {
            expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
        });

        it('should revert when tokenID is nonexistent', async () => {
            const invalidTokenId = 2;
            const expectedRevertMessage = 'ERC721: approved query for nonexistent token';
            await expect(erc721Facet.getApproved(invalidTokenId))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('transfers', async () => {
        beforeEach(async () => {
            await erc721Facet.approve(approved.address, tokenID);
            await erc721Facet.setApprovalForAll(operator.address, true);
        });

        describe('transferFrom', async () => {
            it('should successfully transferFrom when called by owner', async () => {
                // when:
                const tx = await erc721Facet.transferFrom(owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully transferFrom when called by approved', async () => {
                // when:
                const tx = await erc721Facet.connect(approved).transferFrom(owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully transferFrom when called by operator', async () => {
                // when:
                const tx = await erc721Facet.connect(operator).transferFrom(owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully transferFrom when called by owner without approval', async () => {
                // given:
                await erc721Facet.approve(ethers.constants.AddressZero, tokenID);
                // when:
                const tx = await erc721Facet.transferFrom(owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully transferFrom from owner to owner', async () => {
                // when:
                const tx = await erc721Facet.transferFrom(owner.address, owner.address, tokenID);

                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });

            it('should clear consumer when transferred', async () => {
                // given:
                await erc721Facet.changeConsumer(consumer.address, tokenID);

                // when:
                const tx = await erc721Facet.transferFrom(owner.address, owner.address, tokenID);

                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });

            it('should revert when sender is not owner', async () => {
                const expectedRevertMessage = 'ERC721: transfer of token that is not own';
                await expect(erc721Facet.transferFrom(other.address, owner.address, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when receiver is 0x0', async () => {
                const expectedRevertMessage = 'ERC721: transfer to the zero address';
                await expect(erc721Facet.transferFrom(owner.address, ethers.constants.AddressZero, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not authorized', async () => {
                const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';
                await expect(erc721Facet.connect(other).transferFrom(owner.address, other.address, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when tokenID is nonexistent', async () => {
                const invalidTokenID = 2;
                const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                await expect(erc721Facet.transferFrom(owner.address, other.address, invalidTokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('safeTransferFrom(3)', async () => {
            it('should successfully safeTransferFrom when called by owner', async () => {
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by approved', async () => {
                // when:
                const tx = await erc721Facet.connect(approved)['safeTransferFrom(address,address,uint256)'](owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by operator', async () => {
                // when:
                const tx = await erc721Facet.connect(operator)['safeTransferFrom(address,address,uint256)'](owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by owner without approval', async () => {
                // given:
                await erc721Facet.approve(ethers.constants.AddressZero, tokenID);
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, other.address, tokenID);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom from owner to owner', async () => {
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, owner.address, tokenID);

                await expect(tx)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });


            it('should clear consumer when safeTransferFrom', async () => {
                // given:
                await erc721Facet.changeConsumer(consumer.address, tokenID);

                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, owner.address, tokenID);

                await expect(tx)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });

            it('should revert when sender is not owner', async () => {
                const expectedRevertMessage = 'ERC721: transfer of token that is not own';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](other.address, owner.address, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when receiver is 0x0', async () => {
                const expectedRevertMessage = 'ERC721: transfer to the zero address';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, ethers.constants.AddressZero, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not authorized', async () => {
                const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';
                await expect(erc721Facet.connect(other)['safeTransferFrom(address,address,uint256)'](owner.address, other.address, tokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when tokenID is nonexistent', async () => {
                const invalidTokenID = 2;
                const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, other.address, invalidTokenID))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            describe('to a valid contract', async () => {
                let contractReceiver: Contract;
                beforeEach(async () => {
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_NONE]);
                });

                it('should successfully safeTransferFrom when called by owner', async () => {
                    // when:
                    const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(owner.address, owner.address, tokenID, "0x");
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by approved', async () => {
                    // when:
                    const tx = await erc721Facet.connect(approved)['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(approved.address, owner.address, tokenID, "0x");
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by operator', async () => {
                    // when:
                    const tx = await erc721Facet.connect(operator)['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(operator.address, owner.address, tokenID, "0x");
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by owner without approval', async () => {
                    // given:
                    await erc721Facet.approve(ethers.constants.AddressZero, tokenID);
                    // when:
                    const tx = await erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(owner.address, owner.address, tokenID, "0x");
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should revert when receiver contract returns unexpected value', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [0x42424242, ERROR_NONE]);
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts with message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_REVERT_WITH_MESSAGE]);
                    const expectedRevertMessage = 'ERC721ReceiverMock: reverting';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts without message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_REVERT_WITHOUT_MESSAGE]);
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts without message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_PANIC]);
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, contractReceiver.address, tokenID))
                        .to.be.reverted;
                });

                it('should revert when receiver contract does not implement function', async () => {
                    // given:
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256)'](owner.address, ownership.address, tokenID))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });
        });

        describe('safeTransferFrom(4)', async () => {
            it('should successfully safeTransferFrom when called by owner', async () => {
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, tokenID, data);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by approved', async () => {
                // when:
                const tx = await erc721Facet.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, tokenID, data);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by operator', async () => {
                // when:
                const tx = await erc721Facet.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, tokenID, data);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom when called by owner without approval', async () => {
                // given:
                await erc721Facet.approve(ethers.constants.AddressZero, tokenID);
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, tokenID, data);

                // then:
                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, other.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(other.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                // and:
                expect(await erc721Facet.balanceOf(other.address)).to.equal(1);
            });

            it('should successfully safeTransferFrom from owner to owner', async () => {
                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, owner.address, tokenID, data);

                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });

            it('should clear consumer when safeTransferFrom', async () => {
                // given:
                await erc721Facet.changeConsumer(consumer.address, tokenID);

                // when:
                const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, owner.address, tokenID, data);

                await expect(tx)
                    .to.emit(erc721Facet, 'ConsumerChanged')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                    .to.emit(erc721Facet, 'Transfer')
                    .withArgs(owner.address, owner.address, tokenID)
                    .to.emit(erc721Facet, 'Approval')
                    .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
                // and:
                expect(await erc721Facet.ownerOf(tokenID)).to.equal(owner.address);
                // and:
                expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                // and:
                expect(await erc721Facet.balanceOf(owner.address)).to.equal(1);
            });

            it('should revert when sender is not owner', async () => {
                const expectedRevertMessage = 'ERC721: transfer of token that is not own';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](other.address, owner.address, tokenID, data))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when receiver is 0x0', async () => {
                const expectedRevertMessage = 'ERC721: transfer to the zero address';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, ethers.constants.AddressZero, tokenID, data))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not authorized', async () => {
                const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';
                await expect(erc721Facet.connect(other)['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, tokenID, data))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when tokenID is nonexistent', async () => {
                const invalidTokenID = 2;
                const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, other.address, invalidTokenID, data))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            describe('to a valid contract', async () => {
                let contractReceiver: Contract;
                beforeEach(async () => {
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_NONE]);
                });

                it('should successfully safeTransferFrom when called by owner', async () => {
                    // when:
                    const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(owner.address, owner.address, tokenID, data);
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by approved', async () => {
                    // when:
                    const tx = await erc721Facet.connect(approved)['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(approved.address, owner.address, tokenID, data);
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by operator', async () => {
                    // when:
                    const tx = await erc721Facet.connect(operator)['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(operator.address, owner.address, tokenID, data);
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should successfully safeTransferFrom when called by owner without approval', async () => {
                    // given:
                    await erc721Facet.approve(ethers.constants.AddressZero, tokenID);
                    // when:
                    const tx = await erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data);

                    // then:
                    await expect(tx)
                        .to.emit(erc721Facet, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(erc721Facet, 'Transfer')
                        .withArgs(owner.address, contractReceiver.address, tokenID)
                        .to.emit(erc721Facet, 'Approval')
                        .withArgs(owner.address, ethers.constants.AddressZero, tokenID)
                        .to.emit(contractReceiver, 'Received')
                        .withArgs(owner.address, owner.address, tokenID, data);
                    // and:
                    expect(await erc721Facet.ownerOf(tokenID)).to.equal(contractReceiver.address);
                    // and:
                    expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
                    // and:
                    expect(await erc721Facet.balanceOf(owner.address)).to.equal(0);
                    // and:
                    expect(await erc721Facet.balanceOf(contractReceiver.address)).to.equal(1);
                });

                it('should revert when receiver contract returns unexpected value', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [0x42424242, ERROR_NONE]);
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts with message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_REVERT_WITH_MESSAGE]);
                    const expectedRevertMessage = 'ERC721ReceiverMock: reverting';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts without message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_REVERT_WITHOUT_MESSAGE]);
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when receiver contract reverts without message', async () => {
                    // given:
                    contractReceiver = await Deployer.deployContract('ERC721ReceiverMock', undefined, [RECEIVER_MAGIC_VALUE, ERROR_PANIC]);
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, contractReceiver.address, tokenID, data))
                        .to.be.reverted;
                });

                it('should revert when receiver contract does not implement function', async () => {
                    // given:
                    const expectedRevertMessage = 'ERC721: transfer to non ERC721Receiver implementer';
                    // then:
                    await expect(erc721Facet['safeTransferFrom(address,address,uint256,bytes)'](owner.address, ownership.address, tokenID, data))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });
        });
    });

    describe('approve', async () => {
        it('should successfully approve', async () => {
            // when:
            const tx = await erc721Facet.approve(ethers.constants.AddressZero, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'Approval')
                .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
            // and:
            expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
        });

        it('should clear previous approval', async () => {
            // given:
            await erc721Facet.approve(approved.address, tokenID);

            // when:
            const tx = await erc721Facet.approve(ethers.constants.AddressZero, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'Approval')
                .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
            // and:
            expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
        });

        it('should re-approve previous', async () => {
            // given:
            await erc721Facet.approve(approved.address, tokenID);

            // when:
            const tx = await erc721Facet.approve(approved.address, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'Approval')
                .withArgs(owner.address, approved.address, tokenID);
            // and:
            expect(await erc721Facet.getApproved(tokenID)).to.equal(approved.address);
        });

        it('should successfully approve when caller is operator', async () => {
            // given:
            await erc721Facet.setApprovalForAll(operator.address, true);
            // when:
            const tx = await erc721Facet.connect(operator).approve(ethers.constants.AddressZero, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'Approval')
                .withArgs(owner.address, ethers.constants.AddressZero, tokenID);
            // and:
            expect(await erc721Facet.getApproved(tokenID)).to.equal(ethers.constants.AddressZero);
        });


        it('should revert when approval receiver is the actual owner', async () => {
            const expectedRevertMessage = 'ERC721: approval to current owner';
            await expect(erc721Facet.approve(owner.address, tokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when caller is not the owner', async () => {
            const expectedRevertMessage = 'ERC721: approve caller is not owner nor approved for all';
            await expect(erc721Facet.connect(other).approve(approved.address, tokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when caller is approved for the token', async () => {
            // given:
            await erc721Facet.approve(approved.address, tokenID);
            // then:
            const expectedRevertMessage = 'ERC721: approve caller is not owner nor approved for all';
            await expect(erc721Facet.connect(approved).approve(approved.address, tokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when tokenID is nonexistent', async () => {
            const invalidTokenID = 2;
            const expectedRevertMessage = 'ERC721: owner query for nonexistent token';
            await expect(erc721Facet.approve(approved.address, invalidTokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('setApprovalForAll', async () => {
        it('should successfully set operator', async () => {
            // when:
            const tx = await erc721Facet.setApprovalForAll(operator.address, true);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'ApprovalForAll')
                .withArgs(owner.address, operator.address, true);
            // and:
            expect(await erc721Facet.isApprovedForAll(owner.address, operator.address)).to.be.true;
        });

        it('should successfully unset operator', async () => {
            // given:
            await erc721Facet.setApprovalForAll(operator.address, true);

            // when:
            const tx = await erc721Facet.setApprovalForAll(operator.address, false);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'ApprovalForAll')
                .withArgs(owner.address, operator.address, false);
            // and:
            expect(await erc721Facet.isApprovedForAll(owner.address, operator.address)).to.be.false;
        });

        it('should revert when operator is the owner', async () => {
            const expectedRevertMessage = 'ERC721: approve to caller';

            // when:
            await expect(erc721Facet.setApprovalForAll(owner.address, true))
                .to.be.revertedWith(expectedRevertMessage);
            // and:
            await expect(erc721Facet.setApprovalForAll(owner.address, false))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('setBaseURI', async () => {
        const newBaseURI = 'https://api.example.com/v2/';

        it('should set base URI successfully', async () => {
            // when:
            await erc721Facet.setBaseURI(newBaseURI);

            // then:
            expect(await erc721Facet.baseURI()).to.be.equal(newBaseURI);
        });

        it('should emit event with args', async () => {
            await expect(erc721Facet.setBaseURI(newBaseURI))
                .to.emit(erc721Facet, 'SetBaseURI')
                .withArgs(newBaseURI);
        });

        it('should get tokenURI properly', async () => {
            expect(await erc721Facet.tokenURI(tokenID)).to.equal(ERC721_BASE_URI + tokenID.toString());
        });

        it('should get tokenURI properly', async () => {
            // when:
            await erc721Facet.setBaseURI(newBaseURI);

            // then:
            expect(await erc721Facet.tokenURI(tokenID)).to.equal(newBaseURI + tokenID.toString());
        });
    });

    describe('tokenURI', async () => {
        it('should revert when tokenID is nonexistent', async () => {
            // given:
            const invalidTokenID = 2;
            const expectedRevertMessage = 'ERC721Metadata: URI query for nonexistent token';

            // when:
            await expect(erc721Facet.tokenURI(invalidTokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });

    describe('consumers', async () => {
        it('should successfully change consumer', async () => {
            // when:
            await erc721Facet.changeConsumer(consumer.address, tokenID);
            // then:
            expect(await erc721Facet.consumerOf(tokenID)).to.equal(consumer.address);
        });

        it('should emit event with args', async () => {
            // when:
            const tx = await erc721Facet.changeConsumer(consumer.address, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'ConsumerChanged')
                .withArgs(owner.address, consumer.address, tokenID);
        });

        it('should successfully change consumer when caller is approved', async () => {
            // given:
            await erc721Facet.approve(approved.address, tokenID);
            // when:
            const tx = await erc721Facet.connect(approved).changeConsumer(consumer.address, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'ConsumerChanged')
                .withArgs(owner.address, consumer.address, tokenID);
            // and:
            expect(await erc721Facet.consumerOf(tokenID)).to.equal(consumer.address);
        });

        it('should successfully change consumer when caller is operator', async () => {
            // given:
            await erc721Facet.setApprovalForAll(operator.address, true);
            // when:
            const tx = await erc721Facet.connect(operator).changeConsumer(consumer.address, tokenID);

            // then:
            await expect(tx)
                .to.emit(erc721Facet, 'ConsumerChanged')
                .withArgs(owner.address, consumer.address, tokenID);
            // and:
            expect(await erc721Facet.consumerOf(tokenID)).to.equal(consumer.address);
        });

        it('should revert when caller is not owner, not approved', async () => {
            const expectedRevertMessage = 'ERC721Consumer: change consumer caller is not owner nor approved';
            await expect(erc721Facet.connect(other).changeConsumer(consumer.address, tokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when caller is approved for the token', async () => {
            // given:
            await erc721Facet.changeConsumer(consumer.address, tokenID);
            // then:
            const expectedRevertMessage = 'ERC721Consumer: change consumer caller is not owner nor approved';
            await expect(erc721Facet.connect(consumer).changeConsumer(consumer.address, tokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when tokenID is nonexistent', async () => {
            const invalidTokenID = 2;
            const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
            await expect(erc721Facet.changeConsumer(consumer.address, invalidTokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });

        it('should revert when calling consumerOf with nonexistent tokenID', async () => {
            const invalidTokenID = 2;
            const expectedRevertMessage = 'ERC721Consumer: consumer query for nonexistent token';
            await expect(erc721Facet.consumerOf(invalidTokenID))
                .to.be.revertedWith(expectedRevertMessage);
        });
    });
});