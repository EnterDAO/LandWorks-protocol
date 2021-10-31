import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { Diamond } from '../utils/diamond';
import { DiamondCutFacet, DiamondLoupeFacet, Erc721Facet, FeeFacet, LandRegistry, MarketplaceFacet, OwnershipFacet, Test1Facet, Test2Facet } from '../typechain';
import { Deployer } from "../utils/deployer";
import FacetCutAction = Diamond.FacetCutAction;
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('LandWorks', function () {
    let loupe: Contract, cut: Contract, ownership: Contract, marketplace: Contract, fee: Contract, erc721: Contract, diamond: Contract;
    let loupeFacet: DiamondLoupeFacet, cutFacet: DiamondCutFacet, ownershipFacet: OwnershipFacet, marketplaceFacet: MarketplaceFacet, feeFacet: FeeFacet, erc721Facet: Erc721Facet;
    let owner: SignerWithAddress, nonOwner: SignerWithAddress, artificialRegistry: SignerWithAddress;
    let snapshotId: any;

    const ERC721_SYMBOL = 'LW';
    const ERC721_NAME = 'LandWorks';
    const ERC721_BASE_URI = 'ipfs://';

    const FEE_PERCENTAGE = 3_000; // 3%
    const FEE_PRECISION = 100_000;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        nonOwner = signers[1];
        artificialRegistry = signers[2];

        cut = await Deployer.deployContract('DiamondCutFacet');
        loupe = await Deployer.deployContract('DiamondLoupeFacet');
        ownership = await Deployer.deployContract('OwnershipFacet');
        marketplace = await Deployer.deployContract('MarketplaceFacet');
        fee = await Deployer.deployContract('FeeFacet');

        const libERC721 = await Deployer.deployContract('LibERC721');
        erc721 = await Deployer.deployContract('ERC721Facet', {
            libraries: {
                LibERC721: libERC721.address
            }
        });

        diamond = await Deployer.deployDiamond(
            'LandWorks',
            [cut, loupe, ownership, marketplace, fee, erc721],
            owner.address,
        );

        loupeFacet = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
        cutFacet = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
        ownershipFacet = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
        marketplaceFacet = (await Diamond.asFacet(diamond, 'MarketplaceFacet')) as MarketplaceFacet;
        feeFacet = (await Diamond.asFacet(diamond, 'FeeFacet')) as FeeFacet;
        erc721Facet = (await Diamond.asFacet(diamond, 'ERC721Facet')) as Erc721Facet;

        // Init ERC721
        await erc721Facet.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI);
        // and:
        await feeFacet.setFeePrecision(FEE_PRECISION);
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot', []);
    });

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);
    });

    describe('General Diamond Tests', () => {

        it('should revert if owner is zero address', async () => {
            await expect(Deployer.deployDiamond(
                'LandWorks',
                [],
                ethers.constants.AddressZero
            )).to.be.revertedWith("owner must not be 0x0")
        });

        it('should be deployed', async function () {
            expect(diamond.address).to.not.equal(0);
        });

        it('should have 6 facets', async () => {
            const actualFacets = await loupeFacet.facetAddresses();
            expect(actualFacets.length).to.be.equal(6);
            expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address, marketplace.address, fee.address, erc721.address]);
        });

        it('has correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
            expect(await loupeFacet.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
            expect(await loupeFacet.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
            expect(await loupeFacet.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);

            const actualMarketplaceSelectors = Diamond.getSelectorsFor(marketplace);
            expect(await loupeFacet.facetFunctionSelectors(marketplace.address)).to.deep.equal(actualMarketplaceSelectors);

            const actualFeeSelectors = Diamond.getSelectorsFor(fee);
            expect(await loupeFacet.facetFunctionSelectors(fee.address)).to.deep.equal(actualFeeSelectors);

            const actualErc721Selectors = Diamond.getSelectorsFor(erc721);
            expect(await loupeFacet.facetFunctionSelectors(erc721.address)).to.deep.equal(actualErc721Selectors);
        });

        it('associates selectors correctly to facets', async function () {
            for (const sel of Diamond.getSelectorsFor(loupe)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(loupe.address);
            }

            for (const sel of Diamond.getSelectorsFor(cut)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(cut.address);
            }

            for (const sel of Diamond.getSelectorsFor(ownership)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(ownership.address);
            }

            for (const sel of Diamond.getSelectorsFor(marketplace)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(marketplace.address);
            }

            for (const sel of Diamond.getSelectorsFor(fee)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(fee.address);
            }

            for (const sel of Diamond.getSelectorsFor(erc721)) {
                expect(await loupeFacet.facetAddress(sel)).to.be.equal(erc721.address);
            }
        });

        it('returns correct response when facets() is called', async function () {
            const facets = await loupeFacet.facets();

            expect(facets[0].facetAddress).to.equal(cut.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

            expect(facets[1].facetAddress).to.equal(loupe.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

            expect(facets[2].facetAddress).to.equal(ownership.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));

            expect(facets[3].facetAddress).to.equal(marketplace.address);
            expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(marketplace));

            expect(facets[4].facetAddress).to.equal(fee.address);
            expect(facets[4].functionSelectors).to.eql(Diamond.getSelectorsFor(fee));

            expect(facets[5].facetAddress).to.equal(erc721.address);
            expect(facets[5].functionSelectors).to.eql(Diamond.getSelectorsFor(erc721));
        });
    });

    describe('DiamondCut Facet', async () => {
        let test1Facet: Contract, test2Facet: Contract;

        beforeEach(async function () {
            test1Facet = await Deployer.deployContract('Test1Facet');
            test2Facet = await Deployer.deployContract('Test2Facet');
        });

        it('should fail if not called by contract owner', async function () {
            const _diamondCut = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];

            await expect(
                cutFacet.connect(nonOwner).diamondCut(_diamondCut, ethers.constants.AddressZero, "0x")
            ).to.be.revertedWith('Must be contract owner');
        });

        it('should allow adding new functions', async function () {
            const addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await expect(cutFacet.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const facets = await loupeFacet.facets();
            expect(facets[6].facetAddress).to.eql(test1Facet.address);
            expect(facets[6].functionSelectors).to.eql(Diamond.getSelectorsFor(test1Facet));

            const test1 = (await Diamond.asFacet(diamond, 'Test1Facet')) as Test1Facet;
            await expect(test1.test1Func1()).to.not.be.reverted;
        });

        it('should allow replacing functions', async function () {
            let addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await cutFacet.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const replaceTest1WithTest2Facet = [{
                facetAddress: test2Facet.address,
                action: FacetCutAction.Replace,
                functionSelectors: Diamond.getSelectorsFor(test2Facet),
            }];

            await expect(cutFacet.connect(owner).diamondCut(replaceTest1WithTest2Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test2 = (await Diamond.asFacet(diamond, 'Test2Facet')) as Test2Facet;
            expect(await test2.test1Func1()).to.be.equal(2);
        });

        it('should allow removing functions', async function () {
            let addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await cutFacet.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const removeTest1Func = [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: [test1Facet.interface.getSighash('test1Func1()')],
            }];

            await expect(cutFacet.connect(owner).diamondCut(removeTest1Func, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test1 = (await Diamond.asFacet(diamond, 'Test1Facet')) as Test1Facet;
            await expect(test1.test1Func1()).to.be.revertedWith('Diamond: Function does not exist');
        });
    });

    describe('Ownership Facet', async () => {

        it('should return owner', async function () {
            expect(await ownershipFacet.owner()).to.equal(owner.address);
        });

        it('should revert if transferOwnership not called by owner', async function () {
            await expect(ownershipFacet.connect(nonOwner).transferOwnership(nonOwner.address))
                .to.be.revertedWith('Must be contract owner');
        });

        it('should revert if transferOwnership called with same address', async function () {
            await expect(ownershipFacet.connect(owner).transferOwnership(owner.address))
                .to.be.revertedWith('Previous owner and new owner must be different');
        });

        it('should allow transferOwnership if called by owner', async function () {
            await expect(ownershipFacet.connect(owner).transferOwnership(nonOwner.address))
                .to.not.be.reverted;

            expect(await ownershipFacet.owner()).to.equal(nonOwner.address);
        });
    });

    describe('MarketplaceFacet', async () => {
        const metaverseId = 0;
        const metaverseName = 'Decentraland';

        describe('setMetaverseName', async () => {

            it('should set metaverse name', async () => {
                // when:
                await marketplaceFacet.setMetaverseName(metaverseId, metaverseName);

                // then:
                expect(await marketplaceFacet.metaverseName(metaverseId)).to.equal(metaverseName);
            });

            it('should emit event with args', async () => {
                await expect(marketplaceFacet.setMetaverseName(metaverseId, metaverseName))
                    .to.emit(marketplaceFacet, 'SetMetaverseName')
                    .withArgs(metaverseId, metaverseName);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(marketplaceFacet.connect(nonOwner).setMetaverseName(metaverseId, metaverseName))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should properly set a list of metaverse names', async () => {
                for (let i = 0; i < 5; i++) {
                    const name = `${i}`;
                    await expect(marketplaceFacet.setMetaverseName(i, name))
                        .to.emit(marketplaceFacet, 'SetMetaverseName')
                        .withArgs(i, name);
                    expect(await marketplaceFacet.metaverseName(i)).to.equal(name);
                }
            });
        });

        describe('setRegistry', async () => {

            it('should add registry', async () => {
                // when:
                await marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true);

                // then:
                expect(await marketplaceFacet.supportsRegistry(metaverseId, artificialRegistry.address)).to.be.true;
                expect(await marketplaceFacet.totalRegistries(metaverseId)).to.equal(1);
                expect(await marketplaceFacet.registryAt(metaverseId, 0)).to.equal(artificialRegistry.address);
            });

            it('should emit event with args', async () => {
                await expect(marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true))
                    .to.emit(marketplaceFacet, 'SetRegistry')
                    .withArgs(metaverseId, artificialRegistry.address, true);
            });

            it('should remove registry', async () => {
                // given:
                await marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true);

                // when:
                await marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, false);

                // then:
                expect(await marketplaceFacet.supportsRegistry(metaverseId, artificialRegistry.address)).to.be.false;
                expect(await marketplaceFacet.totalRegistries(metaverseId)).to.equal(0);
                await expect(marketplaceFacet.registryAt(metaverseId, 0)).to.be.reverted;
            });

            it('should revert when registry is 0x0', async () => {
                const expectedRevertMessage = '_registy must not be 0x0';
                // when:
                await expect(marketplaceFacet.setRegistry(metaverseId, ethers.constants.AddressZero, true))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(marketplaceFacet.setRegistry(metaverseId, ethers.constants.AddressZero, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(marketplaceFacet.connect(nonOwner).setRegistry(metaverseId, artificialRegistry.address, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when registry is already added', async () => {
                // given:
                const expectedRevertMessage = '_registry already added';
                await marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true);

                // when:
                await expect(marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when registry is already removed/never added', async () => {
                const expectedRevertMessage = '_registry not found';

                // when:
                await expect(marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('', async () => {
            let mockERC721Registry: Contract;
            let mockERC20Registry: Contract;

            const metaverseTokenId = 1;
            const minPeriod = 1;
            const maxPeriod = 100;
            const maxFutureBlock = 120;
            const pricePerBlock = 1337;

            const expectedNftId = 0; // the token id of the to-be-minted eNFT when listing

            beforeEach(async () => {
                mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                mockERC20Registry = await Deployer.deployContract('ERC20Mock');

                // and:
                await marketplaceFacet.setRegistry(metaverseId, mockERC721Registry.address, true);
            });

            describe('list', async () => {

                it('should list successfully', async () => {
                    // given:
                    await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);

                    // when:
                    await marketplaceFacet.list(metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureBlock, ethers.constants.AddressZero, pricePerBlock);

                    // then:
                    expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(marketplaceFacet.address);
                    expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                    // and:
                    const asset = await marketplaceFacet.assetAt(expectedNftId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureBlock).to.equal(maxFutureBlock);
                    expect(asset.pricePerBlock).equal(pricePerBlock);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should emit event with args', async () => {
                    // given:
                    await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.emit(marketplaceFacet, 'List')
                        .withArgs(expectedNftId, metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureBlock, ethers.constants.AddressZero, pricePerBlock);
                });

                it('should list successfully with a payment token', async () => {
                    // given:
                    await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);
                    // and:
                    await feeFacet.setTokenPayment(mockERC20Registry.address, 0, true);

                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.emit(marketplaceFacet, 'List')
                        .withArgs(0, metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureBlock, mockERC20Registry.address, pricePerBlock);

                    // then:
                    expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(marketplaceFacet.address);
                    expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                    // and:
                    const asset = await marketplaceFacet.assetAt(expectedNftId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureBlock).to.equal(maxFutureBlock);
                    expect(asset.pricePerBlock).equal(pricePerBlock);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should revert when metaverse registry is 0x0', async () => {
                    const expectedRevertMessage = '_metaverseRegistry must not be 0x0';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            ethers.constants.AddressZero,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period is 0', async () => {
                    const expectedRevertMessage = '_minPeriod must not be 0';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            0,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period is 0', async () => {
                    const expectedRevertMessage = '_maxPeriod must not be 0';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            0,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period exceeds max period', async () => {
                    const expectedRevertMessage = '_minPeriod more than _maxPeriod';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            maxPeriod,
                            minPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period exceeds max future block', async () => {
                    const expectedRevertMessage = '_maxPeriod more than _maxFutureBlock';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxFutureBlock,
                            maxPeriod,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registry is not supported', async () => {
                    const expectedRevertMessage = '_registry not supported';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            artificialRegistry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token is not supported', async () => {
                    const expectedRevertMessage = 'token not supported';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list a non-existing metaverse token id', async () => {
                    const invalidTokenId = 1234;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            invalidTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list to a non-contract metaverse registry', async () => {
                    // given:
                    await marketplaceFacet.setRegistry(metaverseId, artificialRegistry.address, true);

                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            artificialRegistry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.reverted;
                });

                it('should revert when caller is not owner of the to-be-listed eNft', async () => {
                    const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';

                    // when:
                    await expect(marketplaceFacet
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            ethers.constants.AddressZero,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });

            describe('updateConditions', async () => {

                beforeEach(async () => {
                    // given:
                    await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);
                    // and:
                    await marketplaceFacet.list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureBlock,
                        ethers.constants.AddressZero,
                        pricePerBlock);
                    // and:
                    await feeFacet.setTokenPayment(mockERC20Registry.address, 0, true);
                });

                it('should successfully update conditions', async () => {
                    // when:
                    await marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1);

                    // then:
                    expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                    // and:
                    const asset = await marketplaceFacet.assetAt(expectedNftId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 1);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 1);
                    expect(asset.maxFutureBlock).to.equal(maxFutureBlock + 1);
                    expect(asset.pricePerBlock).equal(pricePerBlock + 1);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should emit events with args', async () => {
                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1))
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, owner.address, 0);
                });

                it('should successfully update conditions when caller is approved', async () => {
                    // given:
                    await erc721Facet.approve(nonOwner.address, expectedNftId);

                    // when:
                    await expect(marketplaceFacet
                        .connect(nonOwner)
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1))
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, nonOwner.address, 0);

                    // then:
                    expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                    // and:
                    const asset = await marketplaceFacet.assetAt(expectedNftId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 1);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 1);
                    expect(asset.maxFutureBlock).to.equal(maxFutureBlock + 1);
                    expect(asset.pricePerBlock).equal(pricePerBlock + 1);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should successfully update conditions when caller is operator', async () => {
                    // given:
                    await erc721Facet.setApprovalForAll(nonOwner.address, true);

                    // when:
                    await expect(marketplaceFacet
                        .connect(nonOwner)
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureBlock + 2,
                            mockERC20Registry.address,
                            pricePerBlock + 2))
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureBlock + 2,
                            mockERC20Registry.address,
                            pricePerBlock + 2)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, nonOwner.address, 0);

                    // then:
                    expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                    // and:
                    const asset = await marketplaceFacet.assetAt(expectedNftId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 2);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 2);
                    expect(asset.maxFutureBlock).to.equal(maxFutureBlock + 2);
                    expect(asset.pricePerBlock).equal(pricePerBlock + 2);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should revert when eNft does not exist', async () => {
                    // given:
                    const invalidNftId = ethers.constants.MaxUint256;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            invalidNftId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when caller is not approved', async () => {
                    // given:
                    const expectedRevertMessage = 'caller must be approved or owner of _eNft';

                    // when:
                    await expect(marketplaceFacet
                        .connect(nonOwner)
                        .updateConditions(
                            expectedNftId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when revert when min period is 0', async () => {
                    // given:
                    const expectedRevertMessage = '_minPeriod must not be 0';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            0,
                            maxPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period is 0', async () => {
                    // given:
                    const expectedRevertMessage = '_maxPeriod must not be 0';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod,
                            0,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period exceeds max period', async () => {
                    // given:
                    const expectedRevertMessage = '_minPeriod more than _maxPeriod';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            maxPeriod,
                            minPeriod,
                            maxFutureBlock,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period exceeds max future block', async () => {
                    // given:
                    const expectedRevertMessage = '_maxPeriod more than _maxFutureBlock';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod,
                            maxFutureBlock,
                            maxPeriod,
                            mockERC20Registry.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token is not supported', async () => {
                    // given:
                    const expectedRevertMessage = 'token not supported';

                    // when:
                    await expect(marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod,
                            maxPeriod,
                            maxFutureBlock,
                            nonOwner.address,
                            pricePerBlock))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should also claim rent fee on update', async () => {
                    // given:
                    await marketplaceFacet.connect(nonOwner).rent(expectedNftId, 1, { value: pricePerBlock });
                    const beforeBalance = await owner.getBalance();

                    // when:
                    const tx = await marketplaceFacet
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1);
                    const receipt = await tx.wait();

                    // then:
                    await expect(tx)
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, owner.address, pricePerBlock);

                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerBlock));
                });

                it('should also claim rent fee on update when caller is not owner, but approved for the eNft', async () => {
                    // given:
                    await erc721Facet.approve(nonOwner.address, expectedNftId);
                    await marketplaceFacet.connect(nonOwner).rent(expectedNftId, 1, { value: pricePerBlock });
                    const beforeBalance = await nonOwner.getBalance();

                    // when:
                    const tx = await marketplaceFacet
                        .connect(nonOwner)
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1);
                    const receipt = await tx.wait();

                    // then:
                    await expect(tx)
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, nonOwner.address, pricePerBlock);

                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await nonOwner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerBlock));
                });

                it('should also claim rent fee on update when caller is not owner, but operator for the eNft', async () => {
                    // given:
                    await erc721Facet.setApprovalForAll(nonOwner.address, true);
                    await marketplaceFacet.connect(nonOwner).rent(expectedNftId, 1, { value: pricePerBlock });
                    const beforeBalance = await nonOwner.getBalance();

                    // when:
                    const tx = await marketplaceFacet
                        .connect(nonOwner)
                        .updateConditions(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1);
                    const receipt = await tx.wait();

                    // then:
                    await expect(tx)
                        .to.emit(marketplaceFacet, 'UpdateConditions')
                        .withArgs(
                            expectedNftId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureBlock + 1,
                            mockERC20Registry.address,
                            pricePerBlock + 1)
                        .to.emit(marketplaceFacet, 'ClaimRentFee')
                        .withArgs(expectedNftId, ethers.constants.AddressZero, nonOwner.address, pricePerBlock);

                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await nonOwner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerBlock));
                });
            });

            describe('', async () => {
                beforeEach(async () => {
                    // given:
                    await mockERC721Registry.approve(marketplaceFacet.address, metaverseTokenId);
                    // and:
                    await marketplaceFacet.list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureBlock,
                        ethers.constants.AddressZero,
                        pricePerBlock);
                });

                describe('delist', async () => {
                    it('should successfully delist', async () => {
                        // when:
                        await marketplaceFacet.delist(expectedNftId);

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(owner.address);
                        await expect(erc721Facet.ownerOf(expectedNftId))
                            .to.be.revertedWith('ERC721: owner query for nonexistent token');
                        // and:
                        const asset = await marketplaceFacet.assetAt(expectedNftId);
                        expect(asset.metaverseId).to.equal(0);
                        expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                        expect(asset.metaverseAssetId).to.equal(0);
                        expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                        expect(asset.minPeriod).to.equal(0);
                        expect(asset.maxPeriod).to.equal(0);
                        expect(asset.maxFutureBlock).to.equal(0);
                        expect(asset.pricePerBlock).equal(0);
                        expect(asset.status).to.equal(0);
                        expect(asset.totalRents).to.equal(0);
                    });

                    it('should emit events with args', async () => {
                        // when:
                        await expect(marketplaceFacet
                            .delist(expectedNftId))
                            .to.emit(marketplaceFacet, 'Delist')
                            .withArgs(expectedNftId, owner.address)
                            .to.emit(erc721Facet, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, expectedNftId)
                            .to.emit(marketplaceFacet, 'ClaimRentFee')
                            .withArgs(expectedNftId, ethers.constants.AddressZero, owner.address, 0)
                            // TODO: investigate
                            // .to.emit(mockERC721Registry, 'Transfer')
                            // .withArgs(marketplaceFacet.address, owner.address, expectedNftId);
                            .to.emit(marketplaceFacet, 'Withdraw')
                            .withArgs(expectedNftId, owner.address);
                    });

                    it('should not claim, transfer, burn and clear storage when an active rent exists', async () => {
                        // given:
                        await marketplaceFacet.connect(nonOwner).rent(expectedNftId, maxPeriod, { value: pricePerBlock * maxPeriod });

                        // when:
                        await expect(marketplaceFacet
                            .delist(expectedNftId))
                            .to.emit(marketplaceFacet, 'Delist')
                            .withArgs(expectedNftId, owner.address)
                            .to.not.emit(erc721Facet, 'Transfer')
                            .to.not.emit(marketplaceFacet, 'ClaimRentFee')
                            .to.not.emit(marketplaceFacet, 'Withdraw');

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(marketplaceFacet.address);
                        expect(await erc721Facet.ownerOf(expectedNftId)).to.equal(owner.address);
                        // and:
                        const asset = await marketplaceFacet.assetAt(expectedNftId);
                        expect(asset.metaverseId).to.equal(metaverseId);
                        expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                        expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                        expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                        expect(asset.minPeriod).to.equal(minPeriod);
                        expect(asset.maxPeriod).to.equal(maxPeriod);
                        expect(asset.maxFutureBlock).to.equal(maxFutureBlock);
                        expect(asset.pricePerBlock).equal(pricePerBlock);
                        expect(asset.status).to.equal(1); // Delisted
                        expect(asset.totalRents).to.equal(1);
                    });

                    it('should claim successfully', async () => {
                        // given:
                        await marketplaceFacet.connect(nonOwner).rent(expectedNftId, minPeriod, { value: pricePerBlock * minPeriod });
                        const beforeBalance = await owner.getBalance();

                        // when:
                        const tx = await marketplaceFacet.delist(expectedNftId);
                        const receipt = await tx.wait();

                        // then:
                        await expect(tx)
                            .to.emit(marketplaceFacet, 'Delist')
                            .withArgs(expectedNftId, owner.address)
                            .to.emit(erc721Facet, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, expectedNftId)
                            .to.emit(marketplaceFacet, 'ClaimRentFee')
                            .withArgs(expectedNftId, ethers.constants.AddressZero, owner.address, pricePerBlock * minPeriod)
                            // TODO: investigate
                            // .to.emit(mockERC721Registry, 'Transfer')
                            // .withArgs(marketplaceFacet.address, owner.address, expectedNftId);
                            .to.emit(marketplaceFacet, 'Withdraw')
                            .withArgs(expectedNftId, owner.address);

                        // and:
                        const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                        const afterBalance = await owner.getBalance();
                        expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerBlock));
                    });

                    it('should revert when caller is neither owner, nor approved', async () => {
                        // given:
                        const expectedRevertMessage = 'caller must be approved or owner of _eNft';

                        // when:
                        await expect(marketplaceFacet
                            .connect(nonOwner)
                            .delist(expectedNftId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });
                });

                describe('rent', async () => {
                    const period = minPeriod;
                    const value = pricePerBlock * period;

                    beforeEach(async () => {
                        await feeFacet.setFee(ethers.constants.AddressZero, FEE_PERCENTAGE);
                    });

                    it('should successfully rent', async () => {
                        const expectedProtocolFee = Math.round((value * FEE_PERCENTAGE) / FEE_PRECISION);
                        const expectedRentFee = value - expectedProtocolFee;
                        const beforeBalance = await nonOwner.getBalance();
                        const expectedRentId = 1;

                        // when:
                        const tx = await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, period, { value });
                        const receipt = await tx.wait();

                        // then:
                        const rent = await marketplaceFacet.rentAt(expectedNftId, expectedRentId);
                        expect(rent.startBlock).to.equal(receipt.blockNumber);
                        expect(rent.endBlock).to.equal(rent.startBlock.add(period));
                        expect(rent.renter).to.equal(nonOwner.address);
                        // and:
                        const asset = await marketplaceFacet.assetAt(expectedNftId);
                        expect(asset.totalRents).to.equal(1);
                        // and:
                        const protocolFees = await feeFacet.protocolFeeFor(ethers.constants.AddressZero);
                        expect(protocolFees.paidAmount).to.equal(0);
                        expect(protocolFees.accumulatedAmount).to.equal(expectedProtocolFee);
                        // and:
                        const assetRentFees = await feeFacet.assetRentFeesFor(expectedNftId, ethers.constants.AddressZero);
                        expect(assetRentFees.paidAmount).to.equal(0);
                        expect(assetRentFees.accumulatedAmount).to.equal(expectedRentFee);
                        // and:
                        const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                        const afterBalance = await nonOwner.getBalance();
                        expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                    });

                    it('should emit event with args', async () => {
                        const expectedRentId = 1;

                        // when:
                        const tx = await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, period, { value });
                        const receipt = await tx.wait();
                        const startBlock = receipt.blockNumber;
                        const endBlock = startBlock + period;

                        // then:
                        await expect(tx)
                            .to.emit(marketplaceFacet, 'Rent')
                            .withArgs(expectedNftId, expectedRentId, nonOwner.address, startBlock, endBlock);
                    });

                    it('should calculate new rent from latest and accrue fees', async () => {
                        const expectedProtocolFee = 2 * (Math.round((value * FEE_PERCENTAGE) / FEE_PRECISION)); // calculates 2 rents
                        const expectedRentFee = 2 * value - expectedProtocolFee;
                        const expectedRentId = 2; // expected second rentId
                        // given:
                        await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, period, { value });
                        const expectedStart = (await marketplaceFacet.rentAt(expectedNftId, 1)).endBlock;
                        const expectedEnd = expectedStart.add(period);

                        // when:
                        const tx = await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, period, { value });

                        // then:
                        await expect(tx)
                            .to.emit(marketplaceFacet, 'Rent')
                            .withArgs(expectedNftId, expectedRentId, nonOwner.address, expectedStart, expectedEnd);
                        // and:
                        const asset = await marketplaceFacet.assetAt(expectedNftId);
                        expect(asset.totalRents).to.equal(2);
                        // and:
                        const protocolFees = await feeFacet.protocolFeeFor(ethers.constants.AddressZero);
                        expect(protocolFees.paidAmount).to.equal(0);
                        expect(protocolFees.accumulatedAmount).to.equal(expectedProtocolFee);
                        // and:
                        const assetRentFees = await feeFacet.assetRentFeesFor(expectedNftId, ethers.constants.AddressZero);
                        expect(assetRentFees.paidAmount).to.equal(0);
                        expect(assetRentFees.accumulatedAmount).to.equal(expectedRentFee);
                    });

                    it('should revert when asset is not found', async () => {
                        // given:
                        const invalidNftId = 123;
                        const expectedRevertMessage = '_eNft not found';

                        // when:
                        await expect(marketplaceFacet
                            .rent(invalidNftId, period))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when trying to rent a delisted asset', async () => {
                        // given:
                        const expectedRevertMessage = '_eNft not listed';
                        // and:
                        await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, maxPeriod, { value: maxPeriod * pricePerBlock });
                        // and:
                        await marketplaceFacet.delist(expectedNftId);

                        // when:
                        await expect(marketplaceFacet
                            .rent(expectedNftId, period))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when period is less than asset min period', async () => {
                        // given:
                        const expectedRevertMessage = '_period less than minPeriod';

                        // when:
                        await expect(marketplaceFacet
                            .rent(expectedNftId, 0))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when period is more than asset max period', async () => {
                        // given:
                        const expectedRevertMessage = '_period more than maxPeriod';

                        // when:
                        await expect(marketplaceFacet
                            .rent(expectedNftId, maxPeriod + 1))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when current rents are more than asset maxFutureBlock', async () => {
                        // given:
                        const expectedRevertMessage = 'rent more than current maxFutureBlock';
                        await marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, maxPeriod, { value: maxPeriod * pricePerBlock });
                        // When executing with this period, it will be more than block.number + maxFutureBlock
                        const exceedingPeriod = maxFutureBlock - maxPeriod + 2;

                        // when:
                        await expect(marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, exceedingPeriod))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when msg.value is invalid', async () => {
                        // given:
                        const expectedRevertMessage = 'invalid msg.value';

                        // when:
                        await expect(marketplaceFacet
                            .connect(nonOwner)
                            .rent(expectedNftId, minPeriod))
                            .to.be.revertedWith(expectedRevertMessage);
                    });


                    describe('using token as payment', async () => {
                        beforeEach(async () => {
                            // when:
                            await feeFacet.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);
                            // and:
                            await marketplaceFacet
                                .updateConditions(
                                    expectedNftId,
                                    minPeriod,
                                    maxPeriod,
                                    maxFutureBlock,
                                    mockERC20Registry.address,
                                    pricePerBlock);
                            // and:
                            await mockERC20Registry.mint(nonOwner.address, 10_000);
                        });

                        it('should rent with ERC20', async () => {
                            // given:
                            const expectedProtocolFee = Math.round((value * FEE_PERCENTAGE) / FEE_PRECISION);
                            const expectedRentFee = value - expectedProtocolFee;
                            const beforeBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                            const expectedRentId = 1;
                            // and:
                            await mockERC20Registry.connect(nonOwner).approve(marketplaceFacet.address, value);

                            // when:
                            const tx = await marketplaceFacet
                                .connect(nonOwner)
                                .rent(expectedNftId, period);
                            const receipt = await tx.wait();

                            // then:
                            const rent = await marketplaceFacet.rentAt(expectedNftId, expectedRentId);
                            expect(rent.startBlock).to.equal(receipt.blockNumber);
                            expect(rent.endBlock).to.equal(rent.startBlock.add(period));
                            expect(rent.renter).to.equal(nonOwner.address);
                            // and:
                            const asset = await marketplaceFacet.assetAt(expectedNftId);
                            expect(asset.totalRents).to.equal(1);
                            // and:
                            const protocolFees = await feeFacet.protocolFeeFor(mockERC20Registry.address);
                            expect(protocolFees.paidAmount).to.equal(0);
                            expect(protocolFees.accumulatedAmount).to.equal(expectedProtocolFee);
                            // and:
                            const assetRentFees = await feeFacet.assetRentFeesFor(expectedNftId, mockERC20Registry.address);
                            expect(assetRentFees.paidAmount).to.equal(0);
                            expect(assetRentFees.accumulatedAmount).to.equal(expectedRentFee);
                            // and:
                            const afterBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                            expect(afterBalance).to.equal(beforeBalance.sub(value));
                        });

                        it('should revert when token value is not approved/invalid', async () => {
                            // given:
                            const expectedRevertMessage = 'ERC20: transfer amount exceeds allowance';

                            // when:
                            await expect(marketplaceFacet
                                .connect(nonOwner)
                                .rent(expectedNftId, period))
                                .to.be.revertedWith(expectedRevertMessage);
                        });
                    });
                });

                describe('withdraw', async () => {
                    const period = 2;

                    beforeEach(async () => {
                        // given:
                        await marketplaceFacet.connect(nonOwner).rent(expectedNftId, period, { value: pricePerBlock * period });
                    });

                    it('should withdraw successfully', async () => {
                        // given:
                        await marketplaceFacet.delist(expectedNftId);

                        // when:
                        await marketplaceFacet.withdraw(expectedNftId);

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(owner.address);
                        await expect(erc721Facet.ownerOf(expectedNftId))
                            .to.be.revertedWith('ERC721: owner query for nonexistent token');
                        // and:
                        const asset = await marketplaceFacet.assetAt(expectedNftId);
                        expect(asset.metaverseId).to.equal(0);
                        expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                        expect(asset.metaverseAssetId).to.equal(0);
                        expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                        expect(asset.minPeriod).to.equal(0);
                        expect(asset.maxPeriod).to.equal(0);
                        expect(asset.maxFutureBlock).to.equal(0);
                        expect(asset.pricePerBlock).equal(0);
                        expect(asset.status).to.equal(0);
                        expect(asset.totalRents).to.equal(0);
                    });

                    it('should emit events with args', async () => {
                        // given:
                        await marketplaceFacet.delist(expectedNftId);

                        // when:
                        await expect(marketplaceFacet
                            .withdraw(expectedNftId))
                            .to.emit(erc721Facet, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, expectedNftId)
                            .to.emit(marketplaceFacet, 'ClaimRentFee')
                            .withArgs(expectedNftId, ethers.constants.AddressZero, owner.address, pricePerBlock * period)
                            // TODO: investigate
                            // .to.emit(mockERC721Registry, 'Transfer')
                            // .withArgs(marketplaceFacet.address, owner.address, expectedNftId);
                            .to.emit(marketplaceFacet, 'Withdraw')
                            .withArgs(expectedNftId, owner.address);
                    });

                    it('should revert when asset is not delisted', async () => {
                        // given:
                        const expectedRevertMessage = '_eNft not delisted';

                        // when:
                        await expect(marketplaceFacet
                            .withdraw(expectedNftId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when an active rent exists', async () => {
                        // given:
                        await marketplaceFacet.connect(nonOwner).rent(expectedNftId, period, { value: pricePerBlock * period });
                        await marketplaceFacet.delist(expectedNftId);
                        const expectedRevertMessage = '_eNft has an active rent';

                        // when:
                        await expect(marketplaceFacet
                            .withdraw(expectedNftId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });
                });
            });
        });
    });

    /**
     * The diamond example comes with 8 function selectors
     * [cut, loupe, loupe, loupe, loupe, erc165, transferOwnership, owner]
     * This bug manifests if you delete something from the final
     * selector slot array, so we'll fill up a new slot with
     * things, and have a fresh row to work with.
     */
    describe('Cache Bug', async () => {
        const ownerSel = '0x8da5cb5b'

        const sel0 = '0x19e3b533' // fills up slot 1
        const sel1 = '0x0716c2ae' // fills up slot 1
        const sel2 = '0x11046047' // fills up slot 1
        const sel3 = '0xcf3bbe18' // fills up slot 1
        const sel4 = '0x24c1d5a7' // fills up slot 1
        const sel5 = '0xcbb835f6' // fills up slot 1
        const sel6 = '0xcbb835f7' // fills up slot 1
        const sel7 = '0xcbb835f8' // fills up slot 2
        const sel8 = '0xcbb835f9' // fills up slot 2
        const sel9 = '0xcbb835fa' // fills up slot 2
        const sel10 = '0xcbb835fb' // fills up slot 2
        const selectors = [
            sel0,
            sel1,
            sel2,
            sel3,
            sel4,
            sel5,
            sel6,
            sel7,
            sel8,
            sel9,
            sel10
        ];

        it('should not exhibit the cache bug', async () => {
            const test1Facet = await Deployer.deployContract('Test1Facet');
            const addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }];
            await cutFacet.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            // Remove the function selectors
            const selectorsToRemove = [ownerSel, sel5, sel10];
            const removeSelectorsFacet = [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: selectorsToRemove
            }];
            await cutFacet.connect(owner).diamondCut(removeSelectorsFacet, ethers.constants.AddressZero, '0x');

            // Get the test1Facet's registered functions
            let actualSelectors = await loupeFacet.facetFunctionSelectors(test1Facet.address);
            // Check individual correctness
            expect(actualSelectors).to.include(sel0, 'Does not contain sel0');
            expect(actualSelectors).to.include(sel1, 'Does not contain sel1');
            expect(actualSelectors).to.include(sel2, 'Does not contain sel2');
            expect(actualSelectors).to.include(sel3, 'Does not contain sel3');
            expect(actualSelectors).to.include(sel4, 'Does not contain sel4');
            expect(actualSelectors).to.include(sel6, 'Does not contain sel6');
            expect(actualSelectors).to.include(sel7, 'Does not contain sel7');
            expect(actualSelectors).to.include(sel8, 'Does not contain sel8');
            expect(actualSelectors).to.include(sel9, 'Does not contain sel9');

            expect(actualSelectors).to.not.include(ownerSel, 'Contains ownerSel');
            expect(actualSelectors).to.not.include(sel10, 'Contains sel10');
            expect(actualSelectors).to.not.include(sel5, 'Contains sel5');
        });
    });

    xdescribe('ERC721 Test', async () => {
        const ERC721Symbol = 'LW';
        const ERC721Name = 'LandWorks';
        const ERC721BaseURI = 'ipfs://';

        let erc721: Contract;
        let erc721Facet: Erc721Facet;
        let marketplace: Contract;
        let marketplaceFacet: MarketplaceFacet;
        let fee: Contract;
        let feeFacet: FeeFacet;

        let decentralandProxy: Contract;
        let decentralandLandRegistry: Contract;
        let landRegistry: LandRegistry;

        beforeEach(async () => {
            const signers = await ethers.getSigners();
            owner = signers[0];
            nonOwner = signers[1];

            const deployedLib = await Deployer.deployContract('LibERC721');

            cut = await Deployer.deployContract('DiamondCutFacet');
            loupe = await Deployer.deployContract('DiamondLoupeFacet');
            ownership = await Deployer.deployContract('OwnershipFacet');
            erc721 = await Deployer.deployContract('ERC721Facet', {
                libraries: {
                    LibERC721: deployedLib.address
                }
            });
            marketplace = await Deployer.deployContract('MarketplaceFacet');
            fee = await Deployer.deployContract('FeeFacet');
            diamond = await Deployer.deployDiamond(
                'LandWorks',
                [cut, loupe, ownership, erc721, marketplace, fee],
                owner.address,
            );

            loupeFacet = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
            cutFacet = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
            ownershipFacet = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
            erc721Facet = (await Diamond.asFacet(diamond, 'ERC721Facet')) as Erc721Facet;
            marketplaceFacet = (await Diamond.asFacet(diamond, 'MarketplaceFacet')) as MarketplaceFacet;
            feeFacet = (await Diamond.asFacet(diamond, 'FeeFacet')) as FeeFacet;

            // Init ERC721
            await erc721Facet.initERC721(ERC721Name, ERC721Symbol, ERC721BaseURI);

            // Deploy Decentraland LAND
            decentralandProxy = await Deployer.deployContract('LANDProxyMock');
            decentralandLandRegistry = await Deployer.deployContract('LANDRegistryMock');

            await decentralandProxy.upgrade(decentralandLandRegistry.address, owner.address);

            landRegistry = (await ethers.getContractAt('LANDRegistryMock', decentralandProxy.address)) as LandRegistry;
        });

        it('should properly initialised erc721', async () => {
            expect(await erc721Facet.name()).to.equal(ERC721Name);
            expect(await erc721Facet.symbol()).to.equal(ERC721Symbol);
            expect(await erc721Facet.baseURI()).to.equal(ERC721BaseURI);
        });

        it('should list decentraland asset and issue eNft', async () => {
            // given:
            const decentralandMetaverseId = 0;
            await marketplaceFacet.setMetaverseName(decentralandMetaverseId, 'Decentraland');
            await marketplaceFacet.setRegistry(decentralandMetaverseId, landRegistry.address, true);
            // and:
            const x = 0, y = 0;
            await landRegistry.authorizeDeploy(owner.address);
            await landRegistry.assignNewParcel(x, y, owner.address);
            const landId = await landRegistry.encodeTokenId(x, y);
            // and:
            await landRegistry.approve(marketplaceFacet.address, landId);
            const minPeriod = 1;
            const maxPeriod = 100;
            const maxFutureBlock = 120;
            const pricePerBlock = 1337;

            // when:
            await marketplaceFacet.list(decentralandMetaverseId, landRegistry.address, landId, minPeriod, maxPeriod, maxFutureBlock, ethers.constants.AddressZero, pricePerBlock);

            // then:
            expect(await landRegistry.ownerOf(landId)).to.equal(marketplaceFacet.address);
            expect(await erc721Facet.ownerOf(0)).to.equal(owner.address);
            // and:
            const asset = await marketplaceFacet.assetAt(0);
            expect(asset.metaverseId).to.equal(decentralandMetaverseId);
            expect(asset.metaverseRegistry).to.equal(landRegistry.address);
            expect(asset.metaverseAssetId).to.equal(landId);
            expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
            expect(asset.minPeriod).to.equal(minPeriod);
            expect(asset.maxPeriod).to.equal(maxPeriod);
            expect(asset.maxFutureBlock).to.equal(maxFutureBlock);
            expect(asset.pricePerBlock).equal(pricePerBlock);
            expect(asset.status).to.equal(0); // Listed
            expect(asset.totalRents).to.equal(0);
        });
    });
});