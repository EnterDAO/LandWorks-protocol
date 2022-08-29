import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Contract, Signer } from 'ethers';
import { Diamond } from '../utils/diamond';
import {
    EstateRegistry,
    LANDRegistry,
    Test1Facet,
    Test2Facet
} from '../typechain-types';
import { Deployer } from "../utils/deployer";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import FacetCutAction = Diamond.FacetCutAction;

describe('LandWorks', function () {
    let snapshotId: any;

    let loupe: Contract, cut: Contract, ownership: Contract, marketplace: Contract, rent: Contract, fee: Contract, erc721: Contract,
        decentraland: Contract, diamond: Contract;
    let landRegistry: LANDRegistry;
    let estateRegistry: EstateRegistry;

    let owner: SignerWithAddress, nonOwner: SignerWithAddress, artificialRegistry: SignerWithAddress,
        administrativeOperator: SignerWithAddress, administrativeConsumer: SignerWithAddress, consumer: SignerWithAddress,
        listReferrer: SignerWithAddress, rentReferrer: SignerWithAddress;

    const MAX_RENT_START: number = Date.now(); // This is in milliseconds

    let landWorks: Contract;
    const ERC721_SYMBOL = 'LW';
    const ERC721_NAME = 'LandWorks';
    const ERC721_BASE_URI = 'ipfs://';

    const FEE_PERCENTAGE = 3_000; // 3%
    const FEE_PRECISION = 100_000;
    const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';

    const assetId = 0; // The first minted ERC721 Asset

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        nonOwner = signers[1];
        artificialRegistry = signers[2];
        administrativeOperator = signers[3]; // DecentralandFacet administrative operator
        administrativeConsumer = signers[4];
        consumer = signers[5];
        listReferrer = signers[6];
        rentReferrer = signers[7];

        cut = await Deployer.deployContract('DiamondCutFacet');
        loupe = await Deployer.deployContract('DiamondLoupeFacet');
        ownership = await Deployer.deployContract('OwnershipFacet');
        marketplace = await Deployer.deployContract('MarketplaceFacet');
        rent = await Deployer.deployContract('RentFacet');
        fee = await Deployer.deployContract('FeeFacet');
        decentraland = await Deployer.deployContract('DecentralandFacet');
        erc721 = await Deployer.deployContract('ERC721Facet');
        diamond = await Deployer.deployDiamond(
            'LandWorks',
            [cut, loupe, ownership, marketplace, rent, fee, erc721, decentraland],
            owner.address,
        );

        landWorks = await ethers.getContractAt("ILandWorks", diamond.address);

        // Init ERC721
        await landWorks.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI);
        // Set ETH as payment type
        await landWorks.setTokenPayment(ADDRESS_ONE, 0, true);

        // Deploy Decentraland Registry
        const decentralandProxy = await Deployer.deployContract('LANDProxyMock');
        const decentralandLandRegistry = await Deployer.deployContract('LANDRegistryMock');

        await decentralandProxy.upgrade(decentralandLandRegistry.address, owner.address);

        landRegistry = (await ethers.getContractAt('LANDRegistryMock', decentralandProxy.address)) as LANDRegistry;

        estateRegistry = (await Deployer.deployContract('EstateRegistryMock')) as EstateRegistry;

        await landRegistry.setEstateRegistry(estateRegistry.address);

        await estateRegistry['initialize(string,string,address)']("ESTATE", "EST", landRegistry.address);
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
            )).to.be.revertedWith("owner must not be 0x0");
        });

        it('should be deployed', async function () {
            expect(diamond.address).to.not.equal(0);
        });

        it('should have 8 facets', async () => {
            const actualFacets = await landWorks.facetAddresses();
            expect(actualFacets.length).to.be.equal(8);
            expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address, marketplace.address, rent.address, fee.address, erc721.address, decentraland.address]);
        });

        it('has correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
            expect(await landWorks.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
            expect(await landWorks.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
            expect(await landWorks.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);

            const actualMarketplaceSelectors = Diamond.getSelectorsFor(marketplace);
            expect(await landWorks.facetFunctionSelectors(marketplace.address)).to.deep.equal(actualMarketplaceSelectors);

            const actualRentFacetSelectors = Diamond.getSelectorsFor(rent);
            expect(await landWorks.facetFunctionSelectors(rent.address)).to.deep.equal(actualRentFacetSelectors);

            const actualFeeSelectors = Diamond.getSelectorsFor(fee);
            expect(await landWorks.facetFunctionSelectors(fee.address)).to.deep.equal(actualFeeSelectors);

            const actualErc721Selectors = Diamond.getSelectorsFor(erc721);
            expect(await landWorks.facetFunctionSelectors(erc721.address)).to.deep.equal(actualErc721Selectors);

            const actualDecentralandFacetSelectors = Diamond.getSelectorsFor(decentraland);
            expect(await landWorks.facetFunctionSelectors(decentraland.address)).to.deep.equal(actualDecentralandFacetSelectors);
        });

        it('associates selectors correctly to facets', async function () {
            for (const sel of Diamond.getSelectorsFor(loupe)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(loupe.address);
            }

            for (const sel of Diamond.getSelectorsFor(cut)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(cut.address);
            }

            for (const sel of Diamond.getSelectorsFor(ownership)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(ownership.address);
            }

            for (const sel of Diamond.getSelectorsFor(marketplace)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(marketplace.address);
            }

            for (const sel of Diamond.getSelectorsFor(rent)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(rent.address);
            }

            for (const sel of Diamond.getSelectorsFor(fee)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(fee.address);
            }

            for (const sel of Diamond.getSelectorsFor(erc721)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(erc721.address);
            }

            for (const sel of Diamond.getSelectorsFor(decentraland)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(decentraland.address);
            }
        });

        it('returns correct response when facets() is called', async function () {
            const facets = await landWorks.facets();

            expect(facets[0].facetAddress).to.equal(cut.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

            expect(facets[1].facetAddress).to.equal(loupe.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

            expect(facets[2].facetAddress).to.equal(ownership.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));

            expect(facets[3].facetAddress).to.equal(marketplace.address);
            expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(marketplace));

            expect(facets[4].facetAddress).to.equal(rent.address);
            expect(facets[4].functionSelectors).to.eql(Diamond.getSelectorsFor(rent));

            expect(facets[5].facetAddress).to.equal(fee.address);
            expect(facets[5].functionSelectors).to.eql(Diamond.getSelectorsFor(fee));

            expect(facets[6].facetAddress).to.equal(erc721.address);
            expect(facets[6].functionSelectors).to.eql(Diamond.getSelectorsFor(erc721));

            expect(facets[7].facetAddress).to.equal(decentraland.address);
            expect(facets[7].functionSelectors).to.eql(Diamond.getSelectorsFor(decentraland));
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
                landWorks.connect(nonOwner).diamondCut(_diamondCut, ethers.constants.AddressZero, "0x")
            ).to.be.revertedWith('Must be contract owner');
        });

        it('should allow adding new functions', async function () {
            const addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await expect(landWorks.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const facets = await landWorks.facets();
            expect(facets[8].facetAddress).to.eql(test1Facet.address);
            expect(facets[8].functionSelectors).to.eql(Diamond.getSelectorsFor(test1Facet));

            const test1 = (await Diamond.asFacet(diamond, 'Test1Facet')) as Test1Facet;
            await expect(test1.test1Func1()).to.not.be.reverted;
        });

        it('should allow replacing functions', async function () {
            let addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await landWorks.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const replaceTest1WithTest2Facet = [{
                facetAddress: test2Facet.address,
                action: FacetCutAction.Replace,
                functionSelectors: Diamond.getSelectorsFor(test2Facet),
            }];

            await expect(landWorks.connect(owner).diamondCut(replaceTest1WithTest2Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test2 = (await Diamond.asFacet(diamond, 'Test2Facet')) as Test2Facet;
            expect(await test2.test1Func1()).to.be.equal(2);
        });

        it('should allow removing functions', async function () {
            let addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await landWorks.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const removeTest1Func = [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: [test1Facet.interface.getSighash('test1Func1()')],
            }];

            await expect(landWorks.connect(owner).diamondCut(removeTest1Func, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test1 = (await Diamond.asFacet(diamond, 'Test1Facet')) as Test1Facet;
            await expect(test1.test1Func1()).to.be.revertedWith('Diamond: Function does not exist');
        });

        it('should support all declared interfaces', async () => {
            const IERC165 = await ethers.getContractAt('IERC165', ethers.constants.AddressZero);
            expect(await landWorks.supportsInterface(Diamond.getInterfaceId(IERC165))).to.be.true;
            expect(await landWorks.supportsInterface(Diamond.getInterfaceId(cut))).to.be.true;

            const IDiamondLoupe = await ethers.getContractAt('IDiamondLoupe', ethers.constants.AddressZero);
            expect(await landWorks.supportsInterface(Diamond.getInterfaceId(IDiamondLoupe))).to.be.true;

            expect(await landWorks.supportsInterface(Diamond.getInterfaceId(ownership))).to.be.true;

            // Calculating the interface id would require an ABI, consisting of all function selectors,
            // **excluding** the inherited ones.
            const IERC721InterfaceId = '0x80ac58cd';
            expect(await landWorks.supportsInterface(IERC721InterfaceId)).to.be.true;

            const IERC721Metadata = '0x5b5e139f';
            expect(await landWorks.supportsInterface(IERC721Metadata)).to.be.true;

            const IERC721Enumerable = '0x780e9d63';
            expect(await landWorks.supportsInterface(IERC721Enumerable)).to.be.true;

            const IERC721Consumable = await ethers.getContractAt('IERC721Consumable', ethers.constants.AddressZero);
            expect(await landWorks.supportsInterface(Diamond.getInterfaceId(IERC721Consumable))).to.be.true;
        });
    });

    describe('Ownership Facet', async () => {
        it('should return owner', async function () {
            expect(await landWorks.owner()).to.equal(owner.address);
        });

        it('should revert if transferOwnership not called by owner', async function () {
            await expect(landWorks.connect(nonOwner).transferOwnership(nonOwner.address))
                .to.be.revertedWith('Must be contract owner');
        });

        it('should revert if transferOwnership called with same address', async function () {
            await expect(landWorks.connect(owner).transferOwnership(owner.address))
                .to.be.revertedWith('Previous owner and new owner must be different');
        });

        it('should allow transferOwnership if called by owner', async function () {
            await expect(landWorks.connect(owner).transferOwnership(nonOwner.address))
                .to.not.be.reverted;

            expect(await landWorks.owner()).to.equal(nonOwner.address);
        });
    });

    describe('MarketplaceFacet', async () => {
        const metaverseId = 0;
        const metaverseName = 'Decentraland';

        describe('setMetaverseName', async () => {
            it('should set metaverse name', async () => {
                // when:
                await landWorks.setMetaverseName(metaverseId, metaverseName);

                // then:
                expect(await landWorks.metaverseName(metaverseId)).to.equal(metaverseName);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setMetaverseName(metaverseId, metaverseName))
                    .to.emit(landWorks, 'SetMetaverseName')
                    .withArgs(metaverseId, metaverseName);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setMetaverseName(metaverseId, metaverseName))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should properly set a list of metaverse names', async () => {
                for (let i = 0; i < 5; i++) {
                    const name = `${i}`;
                    await expect(landWorks.setMetaverseName(i, name))
                        .to.emit(landWorks, 'SetMetaverseName')
                        .withArgs(i, name);
                    expect(await landWorks.metaverseName(i)).to.equal(name);
                }
            });
        });

        describe('setRegistry', async () => {
            it('should add registry', async () => {
                // when:
                await landWorks.setRegistry(metaverseId, artificialRegistry.address, true);

                // then:
                expect(await landWorks.supportsRegistry(metaverseId, artificialRegistry.address)).to.be.true;
                expect(await landWorks.totalRegistries(metaverseId)).to.equal(1);
                expect(await landWorks.registryAt(metaverseId, 0)).to.equal(artificialRegistry.address);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setRegistry(metaverseId, artificialRegistry.address, true))
                    .to.emit(landWorks, 'SetRegistry')
                    .withArgs(metaverseId, artificialRegistry.address, true);
            });

            it('should remove registry', async () => {
                // given:
                await landWorks.setRegistry(metaverseId, artificialRegistry.address, true);

                // when:
                await landWorks.setRegistry(metaverseId, artificialRegistry.address, false);

                // then:
                expect(await landWorks.supportsRegistry(metaverseId, artificialRegistry.address)).to.be.false;
                expect(await landWorks.totalRegistries(metaverseId)).to.equal(0);
                await expect(landWorks.registryAt(metaverseId, 0)).to.be.reverted;
            });

            it('should revert when registry is 0x0', async () => {
                const expectedRevertMessage = '_registry must not be 0x0';
                // when:
                await expect(landWorks.setRegistry(metaverseId, ethers.constants.AddressZero, true))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(landWorks.setRegistry(metaverseId, ethers.constants.AddressZero, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setRegistry(metaverseId, artificialRegistry.address, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when registry is already added', async () => {
                // given:
                const expectedRevertMessage = '_registry already added';
                await landWorks.setRegistry(metaverseId, artificialRegistry.address, true);

                // when:
                await expect(landWorks.setRegistry(metaverseId, artificialRegistry.address, true))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when registry is already removed/never added', async () => {
                const expectedRevertMessage = '_registry not found';

                // when:
                await expect(landWorks.setRegistry(metaverseId, artificialRegistry.address, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('', async () => {
            let mockERC721Registry: Contract;
            let mockERC20Registry: Contract;

            const metaverseTokenId = 1;
            const minPeriod = 1;
            const maxPeriod = 100;
            const maxFutureTime = 120;
            const pricePerSecond = 1337;

            const assetId = 0; // the token id of the to-be-minted asset when listing

            beforeEach(async () => {
                mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                mockERC20Registry = await Deployer.deployContract('ERC20Mock');

                // and:
                await landWorks.setRegistry(metaverseId, mockERC721Registry.address, true);
            });

            describe('list', async () => {
                it('should list successfully', async () => {
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);

                    // when:
                    await landWorks.list(metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                    // then:
                    expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(1);
                    expect(await landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.equal(assetId);
                    expect(await landWorks.tokenByIndex(assetId)).to.equal(assetId);
                });

                it('should emit event with args', async () => {
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                        .to.emit(landWorks, 'List')
                        .withArgs(assetId, metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond);
                });

                it('should list successfully with a payment token', async () => {
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    // and:
                    await landWorks.setTokenPayment(mockERC20Registry.address, 0, true);

                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                        .to.emit(landWorks, 'List')
                        .withArgs(0, metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);

                    // then:
                    expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should revert when metaverse registry is 0x0', async () => {
                    const expectedRevertMessage = '_metaverseRegistry must not be 0x0';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            ethers.constants.AddressZero,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period is 0', async () => {
                    const expectedRevertMessage = '_minPeriod must not be 0';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            0,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period is 0', async () => {
                    const expectedRevertMessage = '_maxPeriod must not be 0';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            0,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period exceeds max period', async () => {
                    const expectedRevertMessage = '_minPeriod more than _maxPeriod';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            maxPeriod,
                            minPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period exceeds max future time', async () => {
                    const expectedRevertMessage = '_maxPeriod more than _maxFutureTime';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxFutureTime,
                            maxPeriod,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registry is not supported', async () => {
                    const expectedRevertMessage = '_registry not supported';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            artificialRegistry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token is not supported', async () => {
                    const expectedRevertMessage = 'payment type not supported';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list a non-existing metaverse token id', async () => {
                    const invalidTokenId = 1234;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            invalidTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list to a non-contract metaverse registry', async () => {
                    // given:
                    await landWorks.setRegistry(metaverseId, artificialRegistry.address, true);

                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            artificialRegistry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.reverted;
                });

                it('should revert when caller is not owner of the to-be-listed asset', async () => {
                    const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';

                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';

                    // when:
                    await expect(landWorks
                        .list(
                            metaverseId,
                            mockERC721Registry.address,
                            metaverseTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            nonOwner.address
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('withdrawing and listing again should not get the old token id for the latest asset', async () => {
                    const newlyGeneratedTokenId = 1;
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    await landWorks.list(metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);
                    await landWorks.delist(assetId);

                    // when:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    await landWorks.list(metaverseId, mockERC721Registry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                    // then:
                    await expect(landWorks.ownerOf(assetId)).to.be.revertedWith('ERC721: owner query for nonexistent token');
                    // and:
                    expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(newlyGeneratedTokenId)).to.be.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(newlyGeneratedTokenId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(1);
                    expect(await landWorks.tokenOfOwnerByIndex(owner.address, 0)).to.equal(newlyGeneratedTokenId);
                    expect(await landWorks.tokenByIndex(0)).to.equal(newlyGeneratedTokenId);
                });
            });

            describe('updateConditions', async () => {
                beforeEach(async () => {
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    // and:
                    await landWorks.list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );
                    // and:
                    await landWorks.setTokenPayment(mockERC20Registry.address, 0, true);
                });

                it('should successfully update conditions', async () => {
                    // when:
                    await landWorks
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);

                    // then:
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 1);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 1);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime + 1);
                    expect(asset.pricePerSecond).equal(pricePerSecond + 1);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should emit events with args', async () => {
                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1))
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.not.emit(landWorks, 'ClaimRentFee')
                });

                it('should successfully update conditions when caller is approved', async () => {
                    // given:
                    await landWorks.approve(nonOwner.address, assetId);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1))
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.not.emit(landWorks, 'ClaimRentFee')

                    // then:
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 1);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 1);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime + 1);
                    expect(asset.pricePerSecond).equal(pricePerSecond + 1);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should successfully update conditions when caller is operator', async () => {
                    // given:
                    await landWorks.setApprovalForAll(nonOwner.address, true);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateConditions(
                            assetId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureTime + 2,
                            mockERC20Registry.address,
                            pricePerSecond + 2))
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureTime + 2,
                            mockERC20Registry.address,
                            pricePerSecond + 2)

                    // then:
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 2);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 2);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime + 2);
                    expect(asset.pricePerSecond).equal(pricePerSecond + 2);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should successfully update conditions when caller is consumer', async () => {
                    // given:
                    await landWorks.changeConsumer(consumer.address, assetId);

                    // when:
                    await expect(landWorks
                        .connect(consumer)
                        .updateConditions(
                            assetId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureTime + 2,
                            mockERC20Registry.address,
                            pricePerSecond + 2))
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 2,
                            maxPeriod + 2,
                            maxFutureTime + 2,
                            mockERC20Registry.address,
                            pricePerSecond + 2)
                        .to.not.emit(landWorks, 'ClaimRentFee')

                    // then:
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseId);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod + 2);
                    expect(asset.maxPeriod).to.equal(maxPeriod + 2);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime + 2);
                    expect(asset.pricePerSecond).equal(pricePerSecond + 2);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                });

                it('should revert when asset does not exist', async () => {
                    // given:
                    const invalidNftId = ethers.constants.MaxUint256;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            invalidNftId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when caller is not approved', async () => {
                    // given:
                    const expectedRevertMessage = 'caller must be consumer, approved or owner of _assetId';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateConditions(
                            assetId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when revert when min period is 0', async () => {
                    // given:
                    const expectedRevertMessage = '_minPeriod must not be 0';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            0,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period is 0', async () => {
                    // given:
                    const expectedRevertMessage = '_maxPeriod must not be 0';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            minPeriod,
                            0,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period exceeds max period', async () => {
                    // given:
                    const expectedRevertMessage = '_minPeriod more than _maxPeriod';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            maxPeriod,
                            minPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period exceeds max future time', async () => {
                    // given:
                    const expectedRevertMessage = '_maxPeriod more than _maxFutureTime';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            minPeriod,
                            maxFutureTime,
                            maxPeriod,
                            mockERC20Registry.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token is not supported', async () => {
                    // given:
                    const expectedRevertMessage = 'payment type not supported';

                    // when:
                    await expect(landWorks
                        .updateConditions(
                            assetId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            nonOwner.address,
                            pricePerSecond))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should also claim rent fee on update', async () => {
                    // given:
                    await landWorks.connect(nonOwner).rent(assetId, 1, MAX_RENT_START, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    const beforeBalance = await owner.getBalance();

                    // when:
                    const tx = await landWorks
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);
                    const receipt = await tx.wait();

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, pricePerSecond);

                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerSecond));
                });

                it('should also claim rent fee to owner on update when caller is not owner, but approved for the asset', async () => {
                    // given:
                    await landWorks.approve(nonOwner.address, assetId);
                    await landWorks.connect(nonOwner).rent(assetId, 1, MAX_RENT_START, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    const beforeBalance = await owner.getBalance();

                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, pricePerSecond);

                    // and:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(pricePerSecond));
                });

                it('should also claim rent fee to owner on update when caller is not owner, but operator for the asset', async () => {
                    // given:
                    await landWorks.setApprovalForAll(nonOwner.address, true);
                    await landWorks.connect(nonOwner).rent(assetId, 1, MAX_RENT_START, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    const beforeBalance = await owner.getBalance();

                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, pricePerSecond);

                    // and:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(pricePerSecond));
                });

                it('should also claim rent fee to consumer on update when there is consumer set', async () => {
                    // given:
                    await landWorks.changeConsumer(consumer.address, assetId);
                    await landWorks.connect(nonOwner).rent(assetId, 1, MAX_RENT_START, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    const beforeBalance = await consumer.getBalance();

                    // when:
                    const tx = await landWorks
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, consumer.address, pricePerSecond);

                    // and:
                    const afterBalance = await consumer.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(pricePerSecond));
                });

                it('should allow consumer to update conditions', async () => {
                    // given:
                    await landWorks.changeConsumer(consumer.address, assetId);
                    await landWorks.connect(nonOwner).rent(assetId, 1, MAX_RENT_START, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    const beforeBalance = await consumer.getBalance();

                    // when:
                    const tx = await landWorks
                        .connect(consumer)
                        .updateConditions(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1);
                    const receipt = await tx.wait();

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateConditions')
                        .withArgs(
                            assetId,
                            minPeriod + 1,
                            maxPeriod + 1,
                            maxFutureTime + 1,
                            mockERC20Registry.address,
                            pricePerSecond + 1)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, consumer.address, pricePerSecond);

                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await consumer.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerSecond));
                });
            });

            describe('', async () => {
                beforeEach(async () => {
                    // given:
                    await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                    // and:
                    await landWorks.list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );
                });

                describe('delist', async () => {
                    it('should successfully delist', async () => {
                        // when:
                        await landWorks.delist(assetId);

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(owner.address);
                        await expect(landWorks.ownerOf(assetId))
                            .to.be.revertedWith('ERC721: owner query for nonexistent token');
                        // and:
                        const asset = await landWorks.assetAt(assetId);
                        expect(asset.metaverseId).to.equal(0);
                        expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                        expect(asset.metaverseAssetId).to.equal(0);
                        expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                        expect(asset.minPeriod).to.equal(0);
                        expect(asset.maxPeriod).to.equal(0);
                        expect(asset.maxFutureTime).to.equal(0);
                        expect(asset.pricePerSecond).equal(0);
                        expect(asset.status).to.equal(0);
                        expect(asset.totalRents).to.equal(0);
                        expect(await landWorks.totalSupply()).to.equal(0);
                        await expect(landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.be.revertedWith('ERC721Enumerable: owner index out of bounds');
                        await expect(landWorks.tokenByIndex(0)).to.be.revertedWith('ERC721Enumerable: global index out of bounds');
                    });

                    it('should emit events with args', async () => {
                        // when:
                        await expect(landWorks
                            .delist(assetId))
                            .to.emit(landWorks, 'ConsumerChanged')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(landWorks, 'Delist')
                            .withArgs(assetId, owner.address)
                            .to.emit(landWorks, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(mockERC721Registry, 'Transfer')
                            .withArgs(landWorks.address, owner.address, metaverseTokenId)
                            .to.emit(landWorks, 'Withdraw')
                            .withArgs(assetId, owner.address)
                            .to.not.emit(landWorks, 'ClaimRentFee');
                    });

                    it('should not claim, transfer, burn and clear storage when an active rent exists', async () => {
                        // given:
                        const amount = pricePerSecond * maxPeriod;
                        await landWorks.connect(nonOwner).rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });

                        // when:
                        await expect(landWorks
                            .delist(assetId))
                            .to.emit(landWorks, 'Delist')
                            .withArgs(assetId, owner.address)
                            .to.not.emit(landWorks, 'ConsumerChanged')
                            .to.not.emit(landWorks, 'Transfer')
                            .to.not.emit(landWorks, 'ClaimRentFee')
                            .to.not.emit(landWorks, 'Withdraw');

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                        expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                        // and:
                        const asset = await landWorks.assetAt(assetId);
                        expect(asset.metaverseId).to.equal(metaverseId);
                        expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                        expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                        expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                        expect(asset.minPeriod).to.equal(minPeriod);
                        expect(asset.maxPeriod).to.equal(maxPeriod);
                        expect(asset.maxFutureTime).to.equal(maxFutureTime);
                        expect(asset.pricePerSecond).equal(pricePerSecond);
                        expect(asset.status).to.equal(1); // Delisted
                        expect(asset.totalRents).to.equal(1);
                    });

                    it('should claim successfully', async () => {
                        // given:
                        const amount = pricePerSecond * minPeriod;
                        await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                        const beforeBalance = await owner.getBalance();

                        // when:
                        const tx = await landWorks.delist(assetId);
                        const receipt = await tx.wait();

                        // then:
                        await expect(tx)
                            .to.emit(landWorks, 'ConsumerChanged')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(landWorks, 'Delist')
                            .withArgs(assetId, owner.address)
                            .to.emit(landWorks, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(landWorks, 'ClaimRentFee')
                            .withArgs(assetId, ADDRESS_ONE, owner.address, pricePerSecond * minPeriod)
                            .to.emit(mockERC721Registry, 'Transfer')
                            .withArgs(landWorks.address, owner.address, metaverseTokenId)
                            .to.emit(landWorks, 'Withdraw')
                            .withArgs(assetId, owner.address);

                        // and:
                        const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                        const afterBalance = await owner.getBalance();
                        expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(pricePerSecond));
                    });

                    it('should revert when caller is neither owner, nor approved', async () => {
                        // given:
                        const expectedRevertMessage = 'caller must be approved or owner of _assetId';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .delist(assetId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });
                });

                describe('withdraw', async () => {
                    const period = 2;
                    const amount = pricePerSecond * period;

                    beforeEach(async () => {
                        // given:
                        await landWorks.connect(nonOwner).rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                    });

                    it('should withdraw successfully', async () => {
                        // given:
                        await landWorks.delist(assetId);

                        // when:
                        await landWorks.withdraw(assetId);

                        // then:
                        expect(await mockERC721Registry.ownerOf(metaverseTokenId)).to.equal(owner.address);
                        await expect(landWorks.ownerOf(assetId))
                            .to.be.revertedWith('ERC721: owner query for nonexistent token');
                        // and:
                        const asset = await landWorks.assetAt(assetId);
                        expect(asset.metaverseId).to.equal(0);
                        expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                        expect(asset.metaverseAssetId).to.equal(0);
                        expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                        expect(asset.minPeriod).to.equal(0);
                        expect(asset.maxPeriod).to.equal(0);
                        expect(asset.maxFutureTime).to.equal(0);
                        expect(asset.pricePerSecond).equal(0);
                        expect(asset.status).to.equal(0);
                        expect(asset.totalRents).to.equal(0);
                        expect(await landWorks.totalSupply()).to.equal(0);
                        await expect(landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.be.revertedWith('ERC721Enumerable: owner index out of bounds');
                        await expect(landWorks.tokenByIndex(0)).to.be.revertedWith('ERC721Enumerable: global index out of bounds');
                    });

                    it('should emit events with args', async () => {
                        // given:
                        await landWorks.delist(assetId);

                        // when:
                        await expect(landWorks
                            .withdraw(assetId))
                            .to.emit(landWorks, 'ConsumerChanged')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(landWorks, 'Transfer')
                            .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                            .to.emit(landWorks, 'ClaimRentFee')
                            .withArgs(assetId, ADDRESS_ONE, owner.address, pricePerSecond * period)
                            .to.emit(mockERC721Registry, 'Transfer')
                            .withArgs(landWorks.address, owner.address, metaverseTokenId)
                            .to.emit(landWorks, 'Withdraw')
                            .withArgs(assetId, owner.address);
                    });

                    it('should revert when asset does not exist', async () => {
                        // given:
                        const invalidAssetId = 4;
                        const expectedRevertMessage = 'ERC721: operator query for nonexistent token';

                        // when:
                        await expect(landWorks
                            .withdraw(invalidAssetId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when caller is not approved', async () => {
                        // given:
                        const expectedRevertMessage = 'caller must be approved or owner of _assetId';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .withdraw(assetId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when asset is not delisted', async () => {
                        // given:
                        const expectedRevertMessage = '_assetId not delisted';

                        // when:
                        await expect(landWorks
                            .withdraw(assetId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when an active rent exists', async () => {
                        // given:
                        const amount = period * pricePerSecond;
                        await landWorks.connect(nonOwner).rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                        await landWorks.delist(assetId);
                        const expectedRevertMessage = '_assetId has an active rent';

                        // when:
                        await expect(landWorks
                            .withdraw(assetId))
                            .to.be.revertedWith(expectedRevertMessage);
                    });
                });

                describe('rent', async () => {
                    const period = minPeriod;
                    const value = pricePerSecond * period;
                    const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedRentFee = value - expectedProtocolFee;

                    beforeEach(async () => {
                        await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                    });

                    it('should successfully rent', async () => {
                        const beforeBalance = await nonOwner.getBalance();
                        const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                        const expectedRentId = 1;

                        // when:
                        const tx = await landWorks
                            .connect(nonOwner)
                            .rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                        const receipt = await tx.wait();
                        const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                        // then:
                        const rent = await landWorks.rentAt(assetId, expectedRentId);
                        expect(rent.start).to.equal(timestamp);
                        expect(rent.end).to.equal(rent.start.add(period));
                        expect(rent.renter).to.equal(nonOwner.address);
                        // and:
                        const asset = await landWorks.assetAt(assetId);
                        expect(asset.totalRents).to.equal(1);
                        // and:
                        const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                        expect(protocolFees).to.equal(expectedProtocolFee);
                        // and:
                        const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                        expect(assetRentFees).to.equal(expectedRentFee);
                        // and:
                        const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                        const afterBalance = await nonOwner.getBalance();
                        expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                        // and:
                        const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                        expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.add(value));
                    });

                    it('should emit event with args', async () => {
                        const expectedRentId = 1;

                        // when:
                        const tx = await landWorks
                            .connect(nonOwner)
                            .rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                        const receipt = await tx.wait();
                        const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                        const end = start + period;

                        // then:
                        await expect(tx)
                            .to.emit(landWorks, 'Rent')
                            .withArgs(assetId, expectedRentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee);
                    });

                    it('should calculate new rent from latest and accrue fees', async () => {
                        const expectedProtocolFeeAfterSecondRent = 2 * (Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION)); // calculates 2 rents
                        const expectedRentFeeAfterSecondRent = 2 * value - expectedProtocolFeeAfterSecondRent;
                        const expectedRentId = 2; // expected second rentId
                        // given:
                        await landWorks
                            .connect(nonOwner)
                            .rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                        const expectedStart = (await landWorks.rentAt(assetId, 1)).end;
                        const expectedEnd = expectedStart.add(period);

                        // when:
                        const tx = await landWorks
                            .connect(nonOwner)
                            .rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                        // then:
                        await expect(tx)
                            .to.emit(landWorks, 'Rent')
                            .withArgs(assetId, expectedRentId, nonOwner.address, expectedStart, expectedEnd, ADDRESS_ONE, expectedRentFee, expectedProtocolFee);
                        // and:
                        const asset = await landWorks.assetAt(assetId);
                        expect(asset.totalRents).to.equal(2);
                        // and:
                        const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                        expect(protocolFees).to.equal(expectedProtocolFeeAfterSecondRent);
                        // and:
                        const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                        expect(assetRentFees).to.equal(expectedRentFeeAfterSecondRent);
                    });

                    it('should revert when asset is not found', async () => {
                        // given:
                        const invalidNftId = 123;
                        const expectedRevertMessage = '_assetId not found';

                        // when:
                        await expect(landWorks
                            .rent(invalidNftId, period, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when trying to rent a delisted asset', async () => {
                        // given:
                        const expectedRevertMessage = '_assetId not listed';
                        const amount = maxPeriod * pricePerSecond;
                        // and:
                        await landWorks
                            .connect(nonOwner)
                            .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                        // and:
                        await landWorks.delist(assetId);

                        // when:
                        await expect(landWorks
                            .rent(assetId, period, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when period is less than asset min period', async () => {
                        // given:
                        const expectedRevertMessage = '_period less than minPeriod';

                        // when:
                        await expect(landWorks
                            .rent(assetId, 0, MAX_RENT_START, ADDRESS_ONE, 0, ethers.constants.AddressZero))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when period is more than asset max period', async () => {
                        // given:
                        const expectedRevertMessage = '_period more than maxPeriod';

                        // when:
                        await expect(landWorks
                            .rent(assetId, maxPeriod + 1, MAX_RENT_START, ADDRESS_ONE, maxPeriod + 1, ethers.constants.AddressZero))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when current rents are more than asset maxFutureTime', async () => {
                        // given:
                        const expectedRevertMessage = 'rent more than current maxFutureTime';
                        const amount = maxPeriod * pricePerSecond;
                        await landWorks
                            .connect(nonOwner)
                            .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                        // When executing with this period, it will be more than block.timestamp + maxFutureTime
                        const exceedingPeriod = maxFutureTime - maxPeriod + 2;

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, exceedingPeriod, MAX_RENT_START, ADDRESS_ONE, exceedingPeriod * pricePerSecond, ethers.constants.AddressZero, { value: exceedingPeriod * pricePerSecond }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when msg.value is invalid', async () => {
                        // given:
                        const expectedRevertMessage = 'invalid msg.value';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, minPeriod * pricePerSecond, ethers.constants.AddressZero))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when rent start exceeds max rent start provided', async () => {
                        // given:
                        const exceededMaxStart = Math.round((Date.now() - 1_000) / 1000);
                        const expectedRevertMessage = 'rent start exceeds maxRentStart';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, exceededMaxStart, ADDRESS_ONE, minPeriod * pricePerSecond, ethers.constants.AddressZero, { value: minPeriod * pricePerSecond }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when payment token mismatches actual payment token for the asset', async () => {
                        // given:
                        const expectedRevertMessage = 'invalid _paymentToken';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, value, ethers.constants.AddressZero, { value }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when provided amount and actual payment amount mismatch', async () => {
                        // given:
                        const expectedRevertMessage = 'invalid _amount';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, value * 2, ethers.constants.AddressZero, { value }))
                            .to.be.revertedWith(expectedRevertMessage);
                        // and:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, 0, ethers.constants.AddressZero, { value }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when payment token is recently updated', async () => {
                        // given:
                        await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);
                        // and:
                        await landWorks
                            .updateConditions(
                                assetId,
                                minPeriod,
                                maxPeriod,
                                maxFutureTime,
                                mockERC20Registry.address,
                                pricePerSecond);
                        // and:
                        const expectedRevertMessage = 'invalid _paymentToken';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    it('should revert when price per second is recently updated', async () => {
                        // given:
                        await landWorks
                            .updateConditions(
                                assetId,
                                minPeriod,
                                maxPeriod,
                                maxFutureTime,
                                ADDRESS_ONE,
                                pricePerSecond * 10);
                        // and:
                        const expectedRevertMessage = 'invalid _amount';

                        // when:
                        await expect(landWorks
                            .connect(nonOwner)
                            .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                            .to.be.revertedWith(expectedRevertMessage);
                    });

                    describe('using token as payment', async () => {
                        beforeEach(async () => {
                            // when:
                            await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);
                            // and:
                            await landWorks
                                .updateConditions(
                                    assetId,
                                    minPeriod,
                                    maxPeriod,
                                    maxFutureTime,
                                    mockERC20Registry.address,
                                    pricePerSecond);
                            // and:
                            await mockERC20Registry.mint(nonOwner.address, 10_000);
                        });

                        it('should rent with ERC20', async () => {
                            // given:
                            const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
                            const expectedRentFee = value - expectedProtocolFee;
                            const beforeBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                            const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                            const expectedRentId = 1;
                            // and:
                            await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                            // when:
                            const tx = await landWorks
                                .connect(nonOwner)
                                .rent(assetId, period, MAX_RENT_START, mockERC20Registry.address, value, ethers.constants.AddressZero);
                            const receipt = await tx.wait();
                            const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                            // then:
                            const start = timestamp;
                            const end = start + period;
                            expect(tx)
                                .to.emit(landWorks, 'Rent')
                                .withArgs(assetId, expectedRentId, nonOwner.address, start, end, mockERC20Registry.address, expectedRentFee, expectedProtocolFee)
                                .to.emit(mockERC20Registry, 'Transfer')
                                .withArgs(nonOwner.address, landWorks.address, value);
                            // and:
                            const rent = await landWorks.rentAt(assetId, expectedRentId);
                            expect(rent.start).to.equal(timestamp);
                            expect(rent.end).to.equal(rent.start.add(period));
                            expect(rent.renter).to.equal(nonOwner.address);
                            // and:
                            const asset = await landWorks.assetAt(assetId);
                            expect(asset.totalRents).to.equal(1);
                            // and:
                            const protocolFees = await landWorks.protocolFeeFor(mockERC20Registry.address);
                            expect(protocolFees).to.equal(expectedProtocolFee);
                            // and:
                            const assetRentFees = await landWorks.assetRentFeesFor(assetId, mockERC20Registry.address);
                            expect(assetRentFees).to.equal(expectedRentFee);
                            // and:
                            const afterBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                            expect(afterBalance).to.equal(beforeBalance.sub(value));
                            // and:
                            const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                            expect(afterMarketplaceBalance).to.equal(beforeMarketplaceBalance.add(value));
                        });

                        it('should revert when token value is not approved/invalid', async () => {
                            // given:
                            const expectedRevertMessage = 'ERC20: transfer amount exceeds allowance';

                            // when:
                            await expect(landWorks
                                .connect(nonOwner)
                                .rent(assetId, period, MAX_RENT_START, mockERC20Registry.address, value, ethers.constants.AddressZero))
                                .to.be.revertedWith(expectedRevertMessage);
                        });

                        it('should revert when payment token mismatches actual payment token for the asset', async () => {
                            // given:
                            const expectedRevertMessage = 'invalid _paymentToken';
                            // and:
                            await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                            // when:
                            await expect(landWorks
                                .connect(nonOwner)
                                .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero))
                                .to.be.revertedWith(expectedRevertMessage);
                        });

                        it('should revert when provided amount and actual payment mismatch', async () => {
                            // given:
                            const expectedRevertMessage = 'invalid _amount';
                            // and:
                            await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                            // when:
                            await expect(landWorks
                                .connect(nonOwner)
                                .rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, value * 2, ethers.constants.AddressZero))
                                .to.be.revertedWith(expectedRevertMessage);

                            await expect(landWorks
                                .connect(nonOwner)
                                .rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, 0, ethers.constants.AddressZero))
                                .to.be.revertedWith(expectedRevertMessage);
                        });


                        it('should revert when payment token is ERC-20 and msg.value is provided', async () => {
                            // given:
                            const expectedRevertMessage = 'invalid token msg.value';
                            // and:
                            await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                            // when:
                            await expect(landWorks
                                .connect(nonOwner)
                                .rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, value, ethers.constants.AddressZero, { value }))
                                .to.be.revertedWith(expectedRevertMessage);
                        });
                    });
                });
            });
        });
    });

    describe('FeeFacet', async () => {
        let mockERC20Registry: Contract;

        beforeEach(async () => {
            mockERC20Registry = await Deployer.deployContract('ERC20Mock');
        });

        describe('feePrecision', async () => {
            it('should get fee precision', async () => {
                // then:
                expect(await landWorks.feePrecision()).to.equal(FEE_PRECISION);
            });
        });

        describe('setTokenPayment', async () => {
            it('should add token payment', async () => {
                expect(await landWorks.totalTokenPayments()).to.equal(1);
                // when:
                await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);

                // then:
                expect(await landWorks.supportsTokenPayment(mockERC20Registry.address)).to.be.true;
                expect(await landWorks.totalTokenPayments()).to.equal(2);
                expect(await landWorks.tokenPaymentAt(1)).to.equal(mockERC20Registry.address);
                expect(await landWorks.feePercentage(mockERC20Registry.address)).to.equal(FEE_PERCENTAGE);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true))
                    .to.emit(landWorks, 'SetTokenPayment')
                    .withArgs(mockERC20Registry.address, true)
                    .to.emit(landWorks, 'SetFee')
                    .withArgs(mockERC20Registry.address, FEE_PERCENTAGE);
            });

            it('should remove token payment', async () => {
                // given:
                await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);
                expect(await landWorks.totalTokenPayments()).to.equal(2);
                // when:
                await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, false);

                // then:
                expect(await landWorks.supportsTokenPayment(mockERC20Registry.address)).to.be.false;
                expect(await landWorks.totalTokenPayments()).to.equal(1);
                await expect(landWorks.tokenPaymentAt(1)).to.be.reverted;
            });

            it('should revert when token payment is 0x0', async () => {
                const expectedRevertMessage = '_token must not be 0x0';
                // when:
                await expect(landWorks.setTokenPayment(ethers.constants.AddressZero, FEE_PERCENTAGE, true))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(landWorks.setTokenPayment(ethers.constants.AddressZero, FEE_PERCENTAGE, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when token payment is already added', async () => {
                // given:
                const expectedRevertMessage = '_token already added';
                await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);

                // when:
                await expect(landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when token payment is already removed/never added', async () => {
                const expectedRevertMessage = '_token not found';

                // when:
                await expect(landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, false))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when fee percentage equal to precision', async () => {
                const expectedRevertMessage = '_feePercentage exceeds or equal to feePrecision';

                // when:
                await expect(landWorks.setTokenPayment(mockERC20Registry.address, FEE_PRECISION, true))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when fee percentage exceeds precision', async () => {
                const expectedRevertMessage = '_feePercentage exceeds or equal to feePrecision';

                // when:
                await expect(landWorks.setTokenPayment(mockERC20Registry.address, FEE_PRECISION + 1, true))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('setFee', async () => {
            it('should set fee', async () => {
                // when:
                await landWorks.setFee(mockERC20Registry.address, FEE_PERCENTAGE);

                // then:
                expect(await landWorks.feePercentage(mockERC20Registry.address)).to.equal(FEE_PERCENTAGE);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setFee(mockERC20Registry.address, FEE_PERCENTAGE))
                    .to.emit(landWorks, 'SetFee')
                    .withArgs(mockERC20Registry.address, FEE_PERCENTAGE);
            });

            it('should revert caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';

                // when:
                await expect(landWorks.connect(nonOwner).setFee(mockERC20Registry.address, FEE_PERCENTAGE))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('claim', async () => {
            let mockERC721Registry: Contract;
            let mockERC20Registry: Contract;

            const metaverseTokenId = 1;
            const minPeriod = 1;
            const maxPeriod = 100;
            const maxFutureTime = 120;
            const pricePerSecond = 1337;
            const metaverseId = 0;
            const rentValue = pricePerSecond * minPeriod;
            const expectedProtocolFee = Math.floor((rentValue * FEE_PERCENTAGE) / FEE_PRECISION);
            const expectedRentFee = rentValue - expectedProtocolFee;

            const assetId = 0; // the token id of the to-be-minted asset when listing
            beforeEach(async () => {
                mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                mockERC20Registry = await Deployer.deployContract('ERC20Mock');
                // and:
                await mockERC20Registry.mint(nonOwner.address, 10_000);

                // and:
                await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);

                // and:
                await landWorks.setRegistry(metaverseId, mockERC721Registry.address, true);
                // and:
                await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                // and:
                await landWorks.list(
                    metaverseId,
                    mockERC721Registry.address,
                    metaverseTokenId,
                    minPeriod,
                    maxPeriod,
                    maxFutureTime,
                    ADDRESS_ONE,
                    pricePerSecond,
                    ethers.constants.AddressZero
                );

                // and:
                await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, rentValue, ethers.constants.AddressZero, { value: rentValue });
            });

            describe('claimProtocolFee', async () => {

                beforeEach(async () => {
                    // given:
                    await landWorks
                        .updateConditions(assetId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, rentValue);
                    await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, minPeriod * pricePerSecond, ethers.constants.AddressZero);
                });

                it('should claim ETH protocol fee', async () => {
                    // given:
                    const beforeBalance = await owner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    const tx = await landWorks.claimProtocolFee(ADDRESS_ONE);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(expectedProtocolFee));
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should claim ETH protocol fee with approved nonOwner', async () => {
                    // given:
                    const beforeBalance = await owner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimProtocolFee(ADDRESS_ONE);

                    // then:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(expectedProtocolFee));
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should claim token protocol fee', async () => {
                    // given:
                    const beforeBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.claimProtocolFee(mockERC20Registry.address);

                    // then:
                    const afterBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterBalance).to.be.equal(beforeBalance + expectedProtocolFee);
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should claim token protocol fee with nonOwner', async () => {
                    // given:
                    const beforeBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimProtocolFee(mockERC20Registry.address);

                    // then:
                    const afterBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterBalance).to.be.equal(beforeBalance + expectedProtocolFee);
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should emit event with args', async () => {
                    await expect(landWorks.claimProtocolFee(ADDRESS_ONE))
                        .to.emit(landWorks, 'ClaimProtocolFee')
                        .withArgs(ADDRESS_ONE, owner.address, expectedProtocolFee);

                    await expect(landWorks.claimProtocolFee(mockERC20Registry.address))
                        .to.emit(landWorks, 'ClaimProtocolFee')
                        .withArgs(mockERC20Registry.address, owner.address, expectedProtocolFee)
                        .to.emit(mockERC20Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, expectedProtocolFee);
                });

                it('should claim fee even if payment token is removed', async () => {
                    // given:
                    await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, false);
                    // and:
                    const beforeBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.claimProtocolFee(mockERC20Registry.address);

                    // then:
                    const afterBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterBalance).to.be.equal(beforeBalance + expectedProtocolFee);
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should not emit event with args if protocol fee is zero', async () => {
                    // given:
                    await landWorks.claimProtocolFee(mockERC20Registry.address);

                    // when:
                    await expect(landWorks.claimProtocolFee(mockERC20Registry.address))
                        .to.not.emit(landWorks, 'ClaimProtocolFee');
                });
            });

            describe('claimProtocolFees', async () => {
                let tokens: string[];

                beforeEach(async () => {
                    // given:
                    tokens = [ADDRESS_ONE, mockERC20Registry.address];
                    await landWorks
                        .updateConditions(assetId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, rentValue);
                    await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, rentValue, ethers.constants.AddressZero);
                });

                it('should claim protocol fees', async () => {
                    // given:
                    const beforeETHBalance = await owner.getBalance();
                    const beforeETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    const beforeTokenBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    const tx = await landWorks.claimProtocolFees(tokens);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeETHBalance.sub(txFee).add(expectedProtocolFee));
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeETHMarketplaceBalance.sub(expectedProtocolFee));
                    // and:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(beforeTokenBalance + expectedProtocolFee);
                    // and:
                    const afterTokenClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterTokenClaim).to.be.equal(0);
                    // and:
                    const afterTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterTokenMarketplaceBalance).to.be.equal(beforeTokenMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should claim protocol fees with nonOwner', async () => {
                    // given:
                    const beforeETHBalance = await owner.getBalance();
                    const beforeETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    const beforeTokenBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimProtocolFees(tokens);

                    // then:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeETHBalance.add(expectedProtocolFee));
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeETHMarketplaceBalance.sub(expectedProtocolFee));
                    // and:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(beforeTokenBalance + expectedProtocolFee);
                    // and:
                    const afterTokenClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterTokenClaim).to.be.equal(0);
                    // and:
                    const afterTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterTokenMarketplaceBalance).to.be.equal(beforeTokenMarketplaceBalance.sub(expectedProtocolFee));
                });

                it('should emit events with args', async () => {
                    await expect(landWorks.claimProtocolFees(tokens))
                        .to.emit(landWorks, 'ClaimProtocolFee')
                        .withArgs(ADDRESS_ONE, owner.address, expectedProtocolFee)
                        .to.emit(landWorks, 'ClaimProtocolFee')
                        .withArgs(mockERC20Registry.address, owner.address, expectedProtocolFee)
                        .to.emit(mockERC20Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, expectedProtocolFee);
                });

                it('should claim fees even if payment token is removed', async () => {
                    // given:
                    await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, false);
                    // and:
                    const beforeBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.claimProtocolFees(tokens);

                    // then:
                    const afterBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterBalance).to.be.equal(beforeBalance + expectedProtocolFee);
                    // and:
                    const afterClaim = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedProtocolFee));
                });
            });

            describe('claimRentFee', async () => {
                it('should claim ETH rent fee', async () => {
                    // given:
                    const beforeBalance = await owner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    const [callStaticPaymentToken, callStaticRentFee] = await landWorks.callStatic.claimRentFee(assetId);
                    const tx = await landWorks.claimRentFee(assetId);
                    const receipt = await tx.wait();

                    // then:
                    expect(callStaticPaymentToken).to.equal(ADDRESS_ONE);
                    expect(callStaticRentFee).to.equal(expectedRentFee);
                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(expectedRentFee));
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                });

                it('should claim token rent fee', async () => {
                    // given:
                    await landWorks
                        .updateConditions(assetId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, rentValue);
                    await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, rentValue, ethers.constants.AddressZero);
                    // and:
                    const beforeBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    const [callStaticPaymentToken, callStaticRentFee] = await landWorks.callStatic.claimRentFee(assetId);
                    await landWorks.claimRentFee(assetId);

                    // then:
                    expect(callStaticPaymentToken).to.equal(mockERC20Registry.address);
                    expect(callStaticRentFee).to.equal(expectedRentFee);
                    // and:
                    const afterBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterBalance).to.be.equal(beforeBalance + expectedRentFee);
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, mockERC20Registry.address);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                });

                it('should emit event with args', async () => {
                    await expect(landWorks.claimRentFee(assetId))
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, expectedRentFee);
                    // given:
                    await landWorks
                        .updateConditions(assetId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, rentValue);
                    await landWorks.connect(nonOwner).rent(assetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, rentValue, ethers.constants.AddressZero);

                    await expect(landWorks.claimRentFee(assetId))
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, mockERC20Registry.address, owner.address, expectedRentFee)
                        .to.emit(mockERC20Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, expectedRentFee);
                });

                it('should revert when caller is not approved', async () => {
                    const expectedRevertMessage = 'caller must be consumer, approved or owner of asset';

                    // then:
                    await expect(landWorks.connect(nonOwner).claimRentFee(assetId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when asset is nonexistent', async () => {
                    const invalidAssetId = 2;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                    // when:
                    await expect(landWorks.connect(nonOwner).claimRentFee(invalidAssetId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should successfully claim rent fees to owner when caller is approved and there is no consumer', async () => {
                    // given:
                    await landWorks.approve(nonOwner.address, assetId);
                    // and:
                    const beforeBalance = await owner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimRentFee(assetId);

                    // then:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(expectedRentFee));
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                });

                it('should successfully claim rent fees to owner when caller is operator and there is no consumer', async () => {
                    // given:
                    await landWorks.setApprovalForAll(nonOwner.address, true);
                    // and:
                    const beforeBalance = await owner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimRentFee(assetId);

                    // then:
                    const afterBalance = await owner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.add(expectedRentFee));
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                });

                it('should successfully claim rent fees to consumer if there is consumer', async () => {
                    // given:
                    await landWorks.changeConsumer(consumer.address, assetId);
                    // and:
                    const beforeOwnerBalance = await owner.getBalance();
                    const beforeConsumerBalance = await consumer.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    const tx = await landWorks.claimRentFee(assetId);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterOwnerBalance = await owner.getBalance();
                    expect(afterOwnerBalance).to.equal(beforeOwnerBalance.sub(txFee));
                    const afterConsumerBalance = await consumer.getBalance();
                    expect(afterConsumerBalance).to.equal(beforeConsumerBalance.add(expectedRentFee));
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                });

                it('should successfully claim rent fees when caller is consumer', async () => {
                    // given:
                    await landWorks.changeConsumer(consumer.address, assetId);
                    // and:
                    const beforeOwnerBalance = await owner.getBalance();
                    const beforeConsumerBalance = await consumer.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // when:
                    const tx = await landWorks.connect(consumer).claimRentFee(assetId);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterOwnerBalance = await owner.getBalance();
                    expect(afterOwnerBalance).to.equal(beforeOwnerBalance);
                    const afterConsumerBalance = await consumer.getBalance();
                    expect(afterConsumerBalance).to.equal(beforeConsumerBalance.sub(txFee).add(expectedRentFee));
                    // and:
                    const afterClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterClaim).to.be.equal(0);
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.sub(expectedRentFee));
                })
            });

            describe('claimMultipleRentFees', async () => {
                const secondAssetId: number = 1;
                const secondMetaverseTokenId = 2;
                const assetIds = [assetId, secondAssetId];

                beforeEach(async () => {
                    await mockERC721Registry.mint(owner.address, secondMetaverseTokenId);

                    // and:
                    await mockERC721Registry.approve(landWorks.address, secondMetaverseTokenId);
                    // and:
                    await landWorks.list(
                        metaverseId,
                        mockERC721Registry.address,
                        secondMetaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        mockERC20Registry.address,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );

                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, rentValue)
                    await landWorks.connect(nonOwner).rent(secondAssetId, minPeriod, MAX_RENT_START, mockERC20Registry.address, rentValue, ethers.constants.AddressZero);
                });

                it('should claim multiple rent fees successfully', async () => {
                    // given:
                    const beforeETHBalance = await owner.getBalance();
                    const beforeETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);

                    // and:
                    const beforeTokenBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    const tx = await landWorks.claimMultipleRentFees(assetIds);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterETHBalance = await owner.getBalance();
                    expect(afterETHBalance).to.equal(beforeETHBalance.sub(txFee).add(expectedRentFee));
                    // and:
                    const afterETHClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterETHClaim).to.be.equal(0);
                    // and:
                    const afterETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterETHMarketplaceBalance).to.be.equal(beforeETHMarketplaceBalance.sub(expectedRentFee));
                    // and:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(beforeTokenBalance + expectedRentFee);
                    // and:
                    const afterTokenClaim = await landWorks.assetRentFeesFor(secondAssetId, mockERC20Registry.address);
                    expect(afterTokenClaim).to.be.equal(0);
                    // and:
                    const afterTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterTokenMarketplaceBalance).to.be.equal(beforeTokenMarketplaceBalance.sub(expectedRentFee));
                });

                it('should emit events with args', async () => {
                    await expect(landWorks.claimMultipleRentFees(assetIds))
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, expectedRentFee)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(secondAssetId, mockERC20Registry.address, owner.address, expectedRentFee)
                        .to.emit(mockERC20Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, expectedRentFee);
                });

                it('should revert when one of assets is not found', async () => {
                    // given:
                    const invalidAssetId = 2;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                    // when:
                    await expect(landWorks.claimMultipleRentFees([...assetIds, invalidAssetId]))
                        .to.be.revertedWith(expectedRevertMessage);

                    // then:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(0);
                });

                it('should revert when caller is not approved', async () => {
                    const expectedRevertMessage = 'caller must be consumer, approved or owner of asset';

                    // then:
                    await expect(landWorks.connect(nonOwner).claimMultipleRentFees(assetIds))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should successfully claim rent fees to owner when caller is approved', async () => {
                    // given:
                    await landWorks.approve(nonOwner.address, assetId);
                    await landWorks.approve(nonOwner.address, secondAssetId);
                    // and:
                    const beforeETHBalance = await owner.getBalance();
                    const beforeETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    // and:
                    const beforeTokenBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimMultipleRentFees(assetIds);

                    // then:
                    const afterETHBalance = await owner.getBalance();
                    expect(afterETHBalance).to.equal(beforeETHBalance.add(expectedRentFee));
                    // and:
                    const afterETHClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterETHClaim).to.be.equal(0);
                    // and:
                    const afterETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterETHMarketplaceBalance).to.be.equal(beforeETHMarketplaceBalance.sub(expectedRentFee));

                    // and:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(beforeTokenBalance + expectedRentFee);
                    // and:
                    const afterTokenClaim = await landWorks.assetRentFeesFor(secondAssetId, mockERC20Registry.address);
                    expect(afterTokenClaim).to.be.equal(0);
                    // and:
                    const afterTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterTokenMarketplaceBalance).to.be.equal(beforeTokenMarketplaceBalance.sub(expectedRentFee));
                });

                it('should successfully claim rent fees to owner when caller is operator', async () => {
                    // given:
                    await landWorks.setApprovalForAll(nonOwner.address, true);
                    // and:
                    const beforeETHBalance = await owner.getBalance();
                    const beforeETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    // and:
                    const beforeTokenBalance = Number(await mockERC20Registry.balanceOf(owner.address));
                    const beforeTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);

                    // when:
                    await landWorks.connect(nonOwner).claimMultipleRentFees(assetIds);

                    // then:
                    const afterETHBalance = await owner.getBalance();
                    expect(afterETHBalance).to.equal(beforeETHBalance.add(expectedRentFee));
                    // and:
                    const afterETHClaim = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(afterETHClaim).to.be.equal(0);
                    // and:
                    const afterETHMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterETHMarketplaceBalance).to.be.equal(beforeETHMarketplaceBalance.sub(expectedRentFee));

                    // and:
                    const afterTokenBalance = await mockERC20Registry.balanceOf(owner.address);
                    expect(afterTokenBalance).to.be.equal(beforeTokenBalance + expectedRentFee);
                    // and:
                    const afterTokenClaim = await landWorks.assetRentFeesFor(secondAssetId, mockERC20Registry.address);
                    expect(afterTokenClaim).to.be.equal(0);
                    // and:
                    const afterTokenMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterTokenMarketplaceBalance).to.be.equal(beforeTokenMarketplaceBalance.sub(expectedRentFee));
                });
            });
        });
    });

    describe('Decentraland Facet', async () => {
        const metaverseId = 0;
        const minPeriod = 1;
        const maxPeriod = 100;
        const maxFutureTime = 120;
        const pricePerSecond = 1337;
        const value = minPeriod * pricePerSecond;
        const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
        const expectedRentFee = value - expectedProtocolFee;
        const rentId = 1;

        let metaverseTokenId: any;
        let mockERC20Registry: Contract;

        beforeEach(async () => {
            // given:
            await landWorks.setRegistry(metaverseId, landRegistry.address, true);
            await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);

            // Mint LAND
            const x = [0, 42], y = [0, 42];

            await landRegistry.authorizeDeploy(owner.address);
            await landRegistry.assignMultipleParcels(x, y, owner.address);
            const landId = await landRegistry.encodeTokenId(x[0], y[0]);
            metaverseTokenId = await landRegistry.encodeTokenId(x[1], y[1]);

            // and:
            await landRegistry.setApprovalForAll(landWorks.address, true);

            // and:
            await landWorks
                .list(
                    metaverseId,
                    landRegistry.address,
                    landId,
                    minPeriod,
                    maxPeriod,
                    maxFutureTime,
                    ADDRESS_ONE,
                    pricePerSecond,
                    ethers.constants.AddressZero
                );

            // and:
            mockERC20Registry = await Deployer.deployContract('ERC20Mock');
        });

        describe('listDecentraland', async () => {
            const assetId = 1;

            it('should list successfully', async () => {
                // given:
                await landWorks.updateAdministrativeOperator(administrativeOperator.address);
                await landRegistry.approve(landWorks.address, metaverseTokenId);

                // when:
                await landWorks.listDecentraland(metaverseId, landRegistry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                // then:
                expect(await landRegistry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                // and:
                const asset = await landWorks.assetAt(assetId);
                expect(asset.metaverseId).to.equal(metaverseId);
                expect(asset.metaverseRegistry).to.equal(landRegistry.address);
                expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                expect(asset.minPeriod).to.equal(minPeriod);
                expect(asset.maxPeriod).to.equal(maxPeriod);
                expect(asset.maxFutureTime).to.equal(maxFutureTime);
                expect(asset.pricePerSecond).equal(pricePerSecond);
                expect(asset.status).to.equal(0); // Listed
                expect(asset.totalRents).to.equal(0);
                expect(await landWorks.totalSupply()).to.equal(2);
                expect(await landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.equal(assetId);
                expect(await landWorks.tokenByIndex(assetId)).to.equal(assetId);
                // and:
                expect(await landRegistry.updateOperator(metaverseTokenId)).to.equal(administrativeOperator.address);
            });

            it('should emit event with args', async () => {
                // given:
                await landWorks.updateAdministrativeOperator(administrativeOperator.address);
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.emit(landWorks, 'ConsumerChanged')
                    .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                    .to.emit(landWorks, 'Transfer')
                    .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                    .to.emit(landWorks, 'List')
                    .withArgs(assetId, metaverseId, landRegistry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond)
                    .to.emit(landWorks, 'UpdateAdministrativeState')
                    .withArgs(assetId, administrativeOperator.address)
                    .to.emit(landRegistry, 'UpdateOperator')
                    .withArgs(metaverseTokenId, administrativeOperator.address);
            });

            it('should list successfully with a payment token', async () => {
                // given:
                await landWorks.setTokenPayment(mockERC20Registry.address, 0, true);
                await landWorks.updateAdministrativeOperator(administrativeOperator.address);

                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        mockERC20Registry.address,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.emit(landWorks, 'ConsumerChanged')
                    .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                    .to.emit(landWorks, 'Transfer')
                    .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                    .to.emit(landWorks, 'List')
                    .withArgs(1, metaverseId, landRegistry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);

                // then:
                expect(await landRegistry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                // and:
                const asset = await landWorks.assetAt(assetId);
                expect(asset.metaverseId).to.equal(metaverseId);
                expect(asset.metaverseRegistry).to.equal(landRegistry.address);
                expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                expect(asset.minPeriod).to.equal(minPeriod);
                expect(asset.maxPeriod).to.equal(maxPeriod);
                expect(asset.maxFutureTime).to.equal(maxFutureTime);
                expect(asset.pricePerSecond).equal(pricePerSecond);
                expect(asset.status).to.equal(0); // Listed
                expect(asset.totalRents).to.equal(0);
                // and:
                expect(await landRegistry.updateOperator(metaverseTokenId)).to.equal(administrativeOperator.address);
            });

            it('should revert when metaverse registry is 0x0', async () => {
                const expectedRevertMessage = '_metaverseRegistry must not be 0x0';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        ethers.constants.AddressZero,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        mockERC20Registry.address,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when min period is 0', async () => {
                const expectedRevertMessage = '_minPeriod must not be 0';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        0,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when max period is 0', async () => {
                const expectedRevertMessage = '_maxPeriod must not be 0';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        0,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when min period exceeds max period', async () => {
                const expectedRevertMessage = '_minPeriod more than _maxPeriod';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        maxPeriod,
                        minPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when max period exceeds max future time', async () => {
                const expectedRevertMessage = '_maxPeriod more than _maxFutureTime';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxFutureTime,
                        maxPeriod,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when registry is not supported', async () => {
                const expectedRevertMessage = '_registry not supported';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        artificialRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when payment token is not supported', async () => {
                const expectedRevertMessage = 'payment type not supported';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        mockERC20Registry.address,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when trying to list a non-existing metaverse token id', async () => {
                const invalidTokenId = 1234;
                const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        invalidTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.reverted;
            });

            it('should revert when trying to list to a non-contract metaverse registry', async () => {
                // given:
                await landWorks.setRegistry(metaverseId, artificialRegistry.address, true);

                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        artificialRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.reverted;
            });

            it('should revert when caller is not approved of the to-be-listed asset', async () => {
                // given:
                await landRegistry.setApprovalForAll(landWorks.address, false);

                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.reverted;
            });

            it('should revert when caller is not owner of the to-be-listed asset', async () => {
                // when:
                await expect(landWorks
                    .connect(administrativeOperator)
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    ))
                    .to.be.reverted;
            });

            it('should revert when referrer is not whitelisted', async () => {
                const expectedRevertMessage = '_referrer not whitelisted';

                // when:
                await expect(landWorks
                    .listDecentraland(
                        metaverseId,
                        landRegistry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        nonOwner.address
                    ))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('withdrawing and listing again should not get the old token id for the latest asset', async () => {
                const newlyGeneratedTokenId = 2;
                // given:
                await landWorks.listDecentraland(metaverseId, landRegistry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);
                await landWorks.delist(assetId);

                // when:
                await landWorks.listDecentraland(metaverseId, landRegistry.address, metaverseTokenId, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                // then:
                await expect(landWorks.ownerOf(assetId)).to.be.revertedWith('ERC721: owner query for nonexistent token');
                // and:
                expect(await landRegistry.ownerOf(metaverseTokenId)).to.equal(landWorks.address);
                expect(await landWorks.ownerOf(newlyGeneratedTokenId)).to.be.equal(owner.address);
                // and:
                const asset = await landWorks.assetAt(newlyGeneratedTokenId);
                expect(asset.metaverseId).to.equal(metaverseId);
                expect(asset.metaverseRegistry).to.equal(landRegistry.address);
                expect(asset.metaverseAssetId).to.equal(metaverseTokenId);
                expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                expect(asset.minPeriod).to.equal(minPeriod);
                expect(asset.maxPeriod).to.equal(maxPeriod);
                expect(asset.maxFutureTime).to.equal(maxFutureTime);
                expect(asset.pricePerSecond).equal(pricePerSecond);
                expect(asset.status).to.equal(0); // Listed
                expect(asset.totalRents).to.equal(0);
                expect(await landWorks.totalSupply()).to.equal(2);
                expect(await landWorks.tokenOfOwnerByIndex(owner.address, 1)).to.equal(newlyGeneratedTokenId);
                expect(await landWorks.tokenByIndex(1)).to.equal(newlyGeneratedTokenId);
            });
        });

        describe('rentDecentraland', async () => {
            it('should successfully rent decentraland', async () => {
                // given:
                const beforeBalance = await nonOwner.getBalance();
                const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                const expectedRentId = 1;

                // when:
                const tx = await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                const receipt = await tx.wait();
                const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                // then:
                const rent = await landWorks.rentAt(assetId, rentId);
                expect(rent.start).to.equal(timestamp);
                expect(rent.end).to.equal(rent.start.add(minPeriod));
                expect(rent.renter).to.equal(nonOwner.address);
                // and:
                const asset = await landWorks.assetAt(assetId);
                expect(asset.totalRents).to.equal(1);
                // and:
                const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                expect(protocolFees).to.equal(expectedProtocolFee);
                // and:
                const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                expect(assetRentFees).to.equal(expectedRentFee);
                // and:
                const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                const afterBalance = await nonOwner.getBalance();
                expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                // and:
                const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.add(value));
                // and:
                const operator = await landWorks.operatorFor(assetId, expectedRentId);
                expect(operator).to.equal(nonOwner.address);
                // and:
                const landId = (await landWorks.assetAt(assetId)).metaverseAssetId;
                expect(await landRegistry.updateOperator(landId)).to.equal(nonOwner.address);
            });

            it('should emit event with args', async () => {
                // when:
                const tx = await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                const receipt = await tx.wait();
                // then:
                const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                const end = start + minPeriod;

                await expect(tx)
                    .to.emit(landWorks, 'UpdateOperator')
                    .withArgs(assetId, rentId, nonOwner.address)
                    .to.emit(landWorks, 'Rent')
                    .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee)
                    .to.emit(landWorks, 'UpdateState')
                    .withArgs(assetId, rentId, nonOwner.address);
            });

            it('should not update state when rent does not begin in execution block timestamp', async () => {
                // given:
                const secondRentId = 2;
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 2 * minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value * 2, ethers.constants.AddressZero, { value: value * 2 });

                // when:
                const tx = await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, artificialRegistry.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                // then:
                const start = await (await landWorks.rentAt(assetId, rentId)).end;
                const end = start.add(minPeriod);

                await expect(tx)
                    .to.emit(landWorks, 'UpdateOperator')
                    .withArgs(assetId, secondRentId, artificialRegistry.address)
                    .to.emit(landWorks, 'Rent')
                    .withArgs(assetId, secondRentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee)
                    .to.not.emit(landWorks, 'UpdateState')
                    .withArgs(assetId, secondRentId, artificialRegistry.address);
            });

            it('should revert when operator is 0x0', async () => {
                // given:
                const expectedRevertMessage = '_operator must not be 0x0';

                // when:
                await expect(landWorks
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, ethers.constants.AddressZero, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when asset is not found', async () => {
                // given:
                const invalidNftId = 123;
                const expectedRevertMessage = '_assetId not found';

                // when:
                await expect(landWorks
                    .rentDecentraland(invalidNftId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when trying to rent a delisted asset', async () => {
                // given:
                const expectedRevertMessage = '_assetId not listed';
                const amount = maxPeriod * pricePerSecond;
                // and:
                await landWorks
                    .connect(nonOwner)
                    .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                // and:
                await landWorks.delist(assetId);

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when period is less than asset min period', async () => {
                // given:
                const expectedRevertMessage = '_period less than minPeriod';

                // when:
                await expect(landWorks
                    .rentDecentraland(assetId, 0, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when period is more than asset max period', async () => {
                // given:
                const expectedRevertMessage = '_period more than maxPeriod';

                // when:
                await expect(landWorks
                    .rentDecentraland(assetId, maxPeriod + 1, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when current rents are more than asset maxFutureTime', async () => {
                // given:
                const expectedRevertMessage = 'rent more than current maxFutureTime';
                const amount = maxPeriod * pricePerSecond;
                await landWorks
                    .connect(nonOwner)
                    .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                // When executing with this period, it will be more than block.timestamp + maxFutureTime
                const exceedingPeriod = maxFutureTime - maxPeriod + 2;

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, exceedingPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, exceedingPeriod * pricePerSecond, ethers.constants.AddressZero, { value: exceedingPeriod * pricePerSecond }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when msg.value is invalid', async () => {
                // given:
                const expectedRevertMessage = 'invalid msg.value';

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when rent start exceeds max rent start provided', async () => {
                // given:
                const exceededMaxStart = Math.round((Date.now() - 1_000) / 1000);
                const expectedRevertMessage = 'rent start exceeds maxRentStart';

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, exceededMaxStart, owner.address, ADDRESS_ONE, minPeriod * pricePerSecond, ethers.constants.AddressZero, { value: minPeriod * pricePerSecond }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when payment token mismatches actual payment token for the asset', async () => {
                // given:
                const expectedRevertMessage = 'invalid _paymentToken';

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, owner.address, owner.address, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when provided amount and actual payment amount mismatch', async () => {
                // given:
                const expectedRevertMessage = 'invalid _amount';

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value * 2, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, 0, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when trying to set operator during rent and contract does not implement setUpdateOperator', async () => {
                const mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                const secondAssetId = 1;
                const metaverseTokenId = 50;
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                await landWorks.setRegistry(metaverseId, mockERC721Registry.address, true);
                // and:
                await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                await landWorks
                    .list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(secondAssetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.reverted;
            });

            it('should rent using decentraland facet even if asset is not from a decentraland registry', async () => {
                const beforeBalance = await nonOwner.getBalance();
                const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                const expectedRentId = 1;
                const mockERC721Registry = await Deployer.deployContract('ERC721WithSetUpdateOperatorMock');
                const secondAssetId = 1;
                const metaverseTokenId = 50;
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                await landWorks.setRegistry(metaverseId, mockERC721Registry.address, true);
                // and:
                await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                await landWorks
                    .list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );

                // when:
                const tx = await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(secondAssetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                const receipt = await tx.wait();
                const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                // then:
                const rent = await landWorks.rentAt(secondAssetId, rentId);
                expect(rent.start).to.equal(timestamp);
                expect(rent.end).to.equal(rent.start.add(minPeriod));
                expect(rent.renter).to.equal(nonOwner.address);
                // and:
                const asset = await landWorks.assetAt(secondAssetId);
                expect(asset.totalRents).to.equal(1);
                // and:
                const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                expect(protocolFees).to.equal(expectedProtocolFee);
                // and:
                const assetRentFees = await landWorks.assetRentFeesFor(secondAssetId, ADDRESS_ONE);
                expect(assetRentFees).to.equal(expectedRentFee);
                // and:
                const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                const afterBalance = await nonOwner.getBalance();
                expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                // and:
                const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.add(value));
                // and:
                const operator = await landWorks.operatorFor(secondAssetId, expectedRentId);
                expect(operator).to.equal(nonOwner.address);
            });

            it('should revert when price per second is recently updated', async () => {
                // given:
                await landWorks
                    .updateConditions(
                        assetId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond * 10);
                // and:
                const expectedRevertMessage = 'invalid _amount';

                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            describe('using token as payment', async () => {
                let mockERC20Registry: Contract;
                beforeEach(async () => {
                    // when:
                    mockERC20Registry = await Deployer.deployContract('ERC20Mock');
                    // and:
                    await landWorks.setTokenPayment(mockERC20Registry.address, FEE_PERCENTAGE, true);
                    // and:
                    await landWorks
                        .updateConditions(
                            assetId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond);
                    // and:
                    await mockERC20Registry.mint(nonOwner.address, 10_000);
                });

                it('should rentDecentraland with ERC20', async () => {
                    // given:
                    const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedRentFee = value - expectedProtocolFee;
                    const beforeBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                    const beforeMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    const expectedRentId = 1;
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, mockERC20Registry.address, value, ethers.constants.AddressZero);
                    const receipt = await tx.wait();
                    const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                    // then:
                    const start = timestamp;
                    const end = start + minPeriod;
                    expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, expectedRentId, nonOwner.address, start, end, mockERC20Registry.address, expectedRentFee, expectedProtocolFee)
                        .to.emit(mockERC20Registry, 'Transfer')
                        .withArgs(nonOwner.address, landWorks.address, value)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    const rent = await landWorks.rentAt(assetId, expectedRentId);
                    expect(rent.start).to.equal(timestamp);
                    expect(rent.end).to.equal(rent.start.add(minPeriod));
                    expect(rent.renter).to.equal(nonOwner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.totalRents).to.equal(1);
                    // and:
                    const protocolFees = await landWorks.protocolFeeFor(mockERC20Registry.address);
                    expect(protocolFees).to.equal(expectedProtocolFee);
                    // and:
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, mockERC20Registry.address);
                    expect(assetRentFees).to.equal(expectedRentFee);
                    // and:
                    const afterBalance = await mockERC20Registry.balanceOf(nonOwner.address);
                    expect(afterBalance).to.equal(beforeBalance.sub(value));
                    // and:
                    const afterMarketplaceBalance = await mockERC20Registry.balanceOf(landWorks.address);
                    expect(afterMarketplaceBalance).to.equal(beforeMarketplaceBalance.add(value));
                    // and:
                    const operator = await landWorks.operatorFor(assetId, expectedRentId);
                    expect(operator).to.equal(nonOwner.address);
                });

                it('should revert when token value is not approved/invalid', async () => {
                    // given:
                    const expectedRevertMessage = 'ERC20: transfer amount exceeds allowance';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, mockERC20Registry.address, value, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token mismatches actual payment token for the asset', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid _paymentToken';
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when provided amount and actual payment mismatch', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid _amount';
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, mockERC20Registry.address, value * 2, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);

                    await expect(landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, mockERC20Registry.address, 0, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);
                });


                it('should revert when payment token is ERC-20 and msg.value is provided', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid token msg.value';
                    // and:
                    await mockERC20Registry.connect(nonOwner).approve(landWorks.address, value);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, mockERC20Registry.address, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });
        });

        describe('updateState', async () => {
            it('should successfully update state', async () => {
                // given:
                const landId = (await landWorks.assetAt(assetId)).metaverseAssetId;
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 2, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 2 * value, ethers.constants.AddressZero, { value: 2 * value });

                // when:
                await landWorks.updateState(assetId, rentId);

                // then:
                expect(await landRegistry.updateOperator(landId)).to.equal(nonOwner.address);
            });

            it('should emit event with args', async () => {
                // given:
                const landId = (await landWorks.assetAt(assetId)).metaverseAssetId;
                const amount = 2 * value;
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 2, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                // then:
                await expect(landWorks.updateState(assetId, rentId))
                    .to.emit(landWorks, 'UpdateState')
                    .withArgs(assetId, rentId, nonOwner.address)
                    .to.emit(landRegistry, 'UpdateOperator')
                    .withArgs(landId, nonOwner.address);
            });

            it('should revert if asset does not exist', async () => {
                // given:
                const invalidNftId = 123;
                const expectedRevertMessage = '_assetId not found';

                // when:
                await expect(landWorks
                    .updateState(invalidNftId, rentId))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert if it is not this rent\'s period ', async () => {
                // given:
                const expectedRevertMessage = 'block timestamp less than rent start';
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 3, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });
                // and:
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 2, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 2 * value, ethers.constants.AddressZero, { value: 2 * value });

                // when:
                await expect(landWorks.updateState(assetId, 2))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert if the rent has expired', async () => {
                const expectedRevertMessage = 'block timestamp more than or equal to rent end';
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                // when:
                await expect(landWorks.updateState(assetId, rentId))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('updateAdministrativeState', async () => {
            beforeEach(async () => {
                await landWorks.updateAdministrativeOperator(administrativeOperator.address);
            });

            it('should successfully update state', async () => {
                // given:
                const landId = (await landWorks.assetAt(assetId)).metaverseAssetId;

                // when:
                await landWorks.updateAdministrativeState(assetId);

                // then:
                expect(await landRegistry.updateOperator(landId)).to.equal(administrativeOperator.address);
            });

            it('should emit event with args', async () => {
                // given:
                const landId = (await landWorks.assetAt(assetId)).metaverseAssetId;
                // then:
                await expect(landWorks
                    .connect(nonOwner)
                    .updateAdministrativeState(assetId))
                    .to.emit(landWorks, 'UpdateAdministrativeState')
                    .withArgs(assetId, administrativeOperator.address)
                    .to.emit(landRegistry, 'UpdateOperator')
                    .withArgs(landId, administrativeOperator.address);
            });

            it('should revert if asset does not exist', async () => {
                // given:
                const invalidNftId = 123;
                const expectedRevertMessage = '_assetId not found';

                // when:
                await expect(landWorks
                    .updateAdministrativeState(invalidNftId))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert if there is an active rent', async () => {
                // given:
                const expectedRevertMessage = '_assetId has an active rent';
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, 3, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });

                // when:
                await expect(landWorks
                    .updateAdministrativeState(assetId))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert if registry does not support setUpdateOperator', async () => {
                const mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                const secondAssetId = 1;
                const metaverseTokenId = 50;
                await mockERC721Registry.mint(owner.address, metaverseTokenId);
                // and:
                await landWorks.setRegistry(metaverseId, mockERC721Registry.address, true);
                // and:
                await mockERC721Registry.approve(landWorks.address, metaverseTokenId);
                await landWorks
                    .list(
                        metaverseId,
                        mockERC721Registry.address,
                        metaverseTokenId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );

                // when:
                await expect(landWorks
                    .updateAdministrativeState(secondAssetId))
                    .to.be.reverted;
            });
        });

        describe('updateOperator', async () => {
            it('should successfully update operator', async () => {
                // given:
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                // when:
                await landWorks.connect(nonOwner).updateOperator(assetId, rentId, artificialRegistry.address);

                // then:
                expect(await landWorks.operatorFor(assetId, rentId)).to.equal(artificialRegistry.address);
            });

            it('should emit event with args', async () => {
                // given:
                await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                // when:
                await expect(landWorks.connect(nonOwner)
                    .updateOperator(assetId, rentId, artificialRegistry.address))
                    .to.emit(landWorks, 'UpdateOperator')
                    .withArgs(assetId, rentId, artificialRegistry.address);
            });

            it('should revert when operator is 0x0', async () => {
                const expectedRevertMessage = '_newOperator must not be 0x0';
                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .updateOperator(assetId, rentId, ethers.constants.AddressZero))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert if asset does not exist', async () => {
                const invalidAssetId = 213;
                const expectedRevertMessage = '_assetId not found';
                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .updateOperator(invalidAssetId, rentId, nonOwner.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not renter', async () => {
                const expectedRevertMessage = 'caller is not renter';
                // when:
                await expect(landWorks
                    .updateOperator(assetId, rentId, nonOwner.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('updateAdministrativeOperator', async () => {
            it('should successfully update administrative operator', async () => {
                // when:
                await landWorks.updateAdministrativeOperator(administrativeOperator.address);

                // then:
                expect(await landWorks.administrativeOperator()).to.equal(administrativeOperator.address);
            });

            it('should emit event with args', async () => {
                // when:
                await expect(landWorks
                    .updateAdministrativeOperator(administrativeOperator.address))
                    .to.emit(landWorks, 'UpdateAdministrativeOperator')
                    .withArgs(administrativeOperator.address);
            });

            it('should revert when new administrative operator is 0x0', async () => {
                const expectedRevertMessage = '_administrativeOperator must not be 0x0';
                // when:
                await expect(landWorks
                    .updateAdministrativeOperator(ethers.constants.AddressZero))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks
                    .connect(nonOwner)
                    .updateAdministrativeOperator(administrativeOperator.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('using EstateRegistry', async () => {
            const estateId = 1;
            beforeEach(async () => {
                // given:
                await landWorks.setRegistry(metaverseId, estateRegistry.address, true);
                await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                // Creates an estate, consisting of 5 LAND parcels
                const parcels = 5;

                const coordsX = [];
                const coordsY = [];
                for (let x = 1, y = x; x <= parcels; x++) {
                    await landRegistry.assignNewParcel(x, y, owner.address);
                    coordsX.push(x);
                    coordsY.push(y);
                }

                await landRegistry.createEstate(coordsX, coordsY, owner.address);

                await estateRegistry.approve(landWorks.address, estateId);

                await landWorks
                    .list(
                        metaverseId,
                        estateRegistry.address,
                        estateId,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        ethers.constants.AddressZero
                    );
            });

            it('should rent estate', async () => {
                const estateAssetId = 1;
                // given:
                const beforeBalance = await nonOwner.getBalance();
                const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                const expectedRentId = 1;

                // when:
                const tx = await landWorks
                    .connect(nonOwner)
                    .rentDecentraland(estateAssetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                const receipt = await tx.wait();
                const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                // then:
                const rent = await landWorks.rentAt(estateAssetId, rentId);
                expect(rent.start).to.equal(timestamp);
                expect(rent.end).to.equal(rent.start.add(minPeriod));
                expect(rent.renter).to.equal(nonOwner.address);
                // and:
                const asset = await landWorks.assetAt(estateAssetId);
                expect(asset.totalRents).to.equal(1);
                // and:
                const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                expect(protocolFees).to.equal(expectedProtocolFee);
                // and:
                const assetRentFees = await landWorks.assetRentFeesFor(estateAssetId, ADDRESS_ONE);
                expect(assetRentFees).to.equal(expectedRentFee);
                // and:
                const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                const afterBalance = await nonOwner.getBalance();
                expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                // and:
                const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.add(value));
                // and:
                const operator = await landWorks.operatorFor(estateAssetId, expectedRentId);
                expect(operator).to.equal(nonOwner.address);
                // and:
                const estateId = (await landWorks.assetAt(estateAssetId)).metaverseAssetId;
                expect(await estateRegistry.updateOperator(estateId)).to.equal(nonOwner.address);
                // and:
                const start = timestamp;
                const end = start + minPeriod;
                await expect(tx)
                    .to.emit(landWorks, 'UpdateOperator')
                    .withArgs(estateAssetId, rentId, nonOwner.address)
                    .to.emit(landWorks, 'Rent')
                    .withArgs(estateAssetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee)
                    .to.emit(landWorks, 'UpdateState')
                    .withArgs(estateAssetId, rentId, nonOwner.address);
            });
        });
    });

    describe('Diamond cut MetaverseConsumableAdapterFacet', async () => {
        let metaverseConsumableAdapterFacet: Contract;

        let mockERC721Registry: Contract;
        let metaverseAdapter: Contract;
        const tokenID = 1;
        const secondMetaverseTokenID = 2;
        const metaverseID = 1;
        const metaverseName = 'NoConsumer';
        const minPeriod = 1;
        const maxPeriod = 100;
        const maxFutureTime = 120;
        const pricePerSecond = 1337;
        const value = minPeriod * pricePerSecond;
        const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
        const expectedRentFee = value - expectedProtocolFee;
        const rentId = 1;

        beforeEach(async () => {
            metaverseConsumableAdapterFacet = await Deployer.deployContract('MetaverseConsumableAdapterFacet');

            const diamondAddFacet = [
                {
                    facetAddress: metaverseConsumableAdapterFacet.address,
                    action: FacetCutAction.Add,
                    functionSelectors: Diamond.getSelectorsFor(metaverseConsumableAdapterFacet)
                }
            ];

            await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");

            mockERC721Registry = await Deployer.deployContract('ERC721Mock');
            await mockERC721Registry.mint(owner.address, tokenID);
            await mockERC721Registry.mint(owner.address, secondMetaverseTokenID);
            metaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, mockERC721Registry.address]);

            await landWorks.setMetaverseName(metaverseID, metaverseName);
            await landWorks.setRegistry(metaverseID, mockERC721Registry.address, true);

            await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);

            // and:
            await mockERC721Registry.setApprovalForAll(landWorks.address, true);

            await landWorks
                .list(
                    metaverseID,
                    mockERC721Registry.address,
                    tokenID,
                    minPeriod,
                    maxPeriod,
                    maxFutureTime,
                    ADDRESS_ONE,
                    pricePerSecond,
                    ethers.constants.AddressZero
                );
        });

        it('should have 9 facets', async () => {
            const actualFacets = await landWorks.facetAddresses();
            expect(actualFacets.length).to.be.equal(9);
            expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address, marketplace.address, rent.address, fee.address, erc721.address, decentraland.address, metaverseConsumableAdapterFacet.address]);
        });

        it('should have correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
            expect(await landWorks.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
            expect(await landWorks.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
            expect(await landWorks.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);

            const actualMarketplaceSelectors = Diamond.getSelectorsFor(marketplace);
            expect(await landWorks.facetFunctionSelectors(marketplace.address)).to.deep.equal(actualMarketplaceSelectors);

            const actualFeeSelectors = Diamond.getSelectorsFor(fee);
            expect(await landWorks.facetFunctionSelectors(fee.address)).to.deep.equal(actualFeeSelectors);

            const actualErc721Selectors = Diamond.getSelectorsFor(erc721);
            expect(await landWorks.facetFunctionSelectors(erc721.address)).to.deep.equal(actualErc721Selectors);

            const actualDecentralandFacetSelectors = Diamond.getSelectorsFor(decentraland);
            expect(await landWorks.facetFunctionSelectors(decentraland.address)).to.deep.equal(actualDecentralandFacetSelectors);

            const actualMetaverseConsumableAdapterFacetSelectors = Diamond.getSelectorsFor(metaverseConsumableAdapterFacet);
            expect(await landWorks.facetFunctionSelectors(metaverseConsumableAdapterFacet.address)).to.deep.equal(actualMetaverseConsumableAdapterFacetSelectors);
        });

        it('should associate selectors correctly to facets', async function () {
            for (const sel of Diamond.getSelectorsFor(loupe)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(loupe.address);
            }

            for (const sel of Diamond.getSelectorsFor(cut)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(cut.address);
            }

            for (const sel of Diamond.getSelectorsFor(ownership)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(ownership.address);
            }

            for (const sel of Diamond.getSelectorsFor(marketplace)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(marketplace.address);
            }

            for (const sel of Diamond.getSelectorsFor(fee)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(fee.address);
            }

            for (const sel of Diamond.getSelectorsFor(erc721)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(erc721.address);
            }

            for (const sel of Diamond.getSelectorsFor(decentraland)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(decentraland.address);
            }

            for (const sel of Diamond.getSelectorsFor(metaverseConsumableAdapterFacet)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(metaverseConsumableAdapterFacet.address);
            }
        });

        it('should return correct response when facets() is called', async function () {
            const facets = await landWorks.facets();

            expect(facets[0].facetAddress).to.equal(cut.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

            expect(facets[1].facetAddress).to.equal(loupe.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

            expect(facets[2].facetAddress).to.equal(ownership.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));

            expect(facets[3].facetAddress).to.equal(marketplace.address);
            expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(marketplace));

            expect(facets[4].facetAddress).to.equal(rent.address);
            expect(facets[4].functionSelectors).to.eql(Diamond.getSelectorsFor(rent));

            expect(facets[5].facetAddress).to.equal(fee.address);
            expect(facets[5].functionSelectors).to.eql(Diamond.getSelectorsFor(fee));

            expect(facets[6].facetAddress).to.equal(erc721.address);
            expect(facets[6].functionSelectors).to.eql(Diamond.getSelectorsFor(erc721));

            expect(facets[7].facetAddress).to.equal(decentraland.address);
            expect(facets[7].functionSelectors).to.eql(Diamond.getSelectorsFor(decentraland));

            expect(facets[8].facetAddress).to.equal(metaverseConsumableAdapterFacet.address);
            expect(facets[8].functionSelectors).to.eql(Diamond.getSelectorsFor(metaverseConsumableAdapterFacet));
        });

        describe('setConsumableAdapter', async () => {
            it('should successfully set metaverse registry adapter', async () => {
                await landWorks.setConsumableAdapter(mockERC721Registry.address, metaverseAdapter.address);

                expect(await landWorks.consumableAdapter(mockERC721Registry.address)).to.equal(metaverseAdapter.address);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setConsumableAdapter(mockERC721Registry.address, metaverseAdapter.address))
                    .to.emit(landWorks, 'ConsumableAdapterUpdated')
                    .withArgs(mockERC721Registry.address, metaverseAdapter.address);
            });

            it('should revert when metaverse registry is 0x0', async () => {
                const expectedRevertMessage = '_metaverse must not be 0x0';
                // when:
                await expect(landWorks.setConsumableAdapter(ethers.constants.AddressZero, metaverseAdapter.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when adapter is 0x0', async () => {
                const expectedRevertMessage = '_consumableAdapter must not be 0x0';
                // when:
                await expect(landWorks.setConsumableAdapter(mockERC721Registry.address, ethers.constants.AddressZero))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setConsumableAdapter(mockERC721Registry.address, metaverseAdapter.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('setAdministrativeConsumerFor', async () => {
            it('should successfully set metaverse registry administrative consumer', async () => {
                await landWorks.setAdministrativeConsumerFor(mockERC721Registry.address, administrativeConsumer.address);

                expect(await landWorks.administrativeConsumer(mockERC721Registry.address)).to.equal(administrativeConsumer.address);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setAdministrativeConsumerFor(mockERC721Registry.address, administrativeConsumer.address))
                    .to.emit(landWorks, 'AdministrativeConsumerUpdated')
                    .withArgs(mockERC721Registry.address, administrativeConsumer.address);
            });

            it('should revert when metaverse registry is 0x0', async () => {
                const expectedRevertMessage = '_metaverse must not be 0x0';
                // when:
                await expect(landWorks.setAdministrativeConsumerFor(ethers.constants.AddressZero, administrativeConsumer.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when administrative consumer is 0x0', async () => {
                const expectedRevertMessage = '_administrativeConsumer must not be 0x0';
                // when:
                await expect(landWorks.setAdministrativeConsumerFor(mockERC721Registry.address, ethers.constants.AddressZero))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setAdministrativeConsumerFor(mockERC721Registry.address, administrativeConsumer.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('', async () => {
            beforeEach(async () => {
                await landWorks.setConsumableAdapter(mockERC721Registry.address, metaverseAdapter.address);
            });

            describe('listAndSetAdminConsumer', async () => {
                const assetId = 1;
                let mockERC20Registry: any;

                beforeEach(async () => {
                    // given:
                    mockERC20Registry = await Deployer.deployContract('ERC20Mock');
                    await landWorks.setAdministrativeConsumerFor(mockERC721Registry.address, administrativeConsumer.address);
                });

                it('should list successfully', async () => {
                    // when:
                    await landWorks.listAndSetAdminConsumer(metaverseID, mockERC721Registry.address, secondMetaverseTokenID, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                    // then:
                    expect(await mockERC721Registry.ownerOf(secondMetaverseTokenID)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseID);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(secondMetaverseTokenID);
                    expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(2);
                    expect(await landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.equal(assetId);
                    expect(await landWorks.tokenByIndex(assetId)).to.equal(assetId);
                    // and:
                    expect(await metaverseAdapter.consumerOf(secondMetaverseTokenID)).to.equal(administrativeConsumer.address);
                });

                it('should emit event with args', async () => {
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                        .to.emit(landWorks, 'List')
                        .withArgs(assetId, metaverseID, mockERC721Registry.address, secondMetaverseTokenID, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond)
                        .to.emit(landWorks, 'UpdateAdministrativeState')
                        .withArgs(assetId, administrativeOperator.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, administrativeConsumer.address, secondMetaverseTokenID);
                });

                it('should list successfully with a payment token', async () => {
                    // and:
                    await landWorks.setTokenPayment(mockERC20Registry.address, 0, true);

                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(ethers.constants.AddressZero, owner.address, assetId)
                        .to.emit(landWorks, 'List')
                        .withArgs(1, metaverseID, mockERC721Registry.address, secondMetaverseTokenID, minPeriod, maxPeriod, maxFutureTime, mockERC20Registry.address, pricePerSecond);

                    // then:
                    expect(await mockERC721Registry.ownerOf(secondMetaverseTokenID)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(metaverseID);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(secondMetaverseTokenID);
                    expect(asset.paymentToken).to.equal(mockERC20Registry.address);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                    // and:
                    expect(await metaverseAdapter.consumerOf(secondMetaverseTokenID)).to.equal(administrativeConsumer.address);
                });

                it('should revert when metaverse registry is 0x0', async () => {
                    const expectedRevertMessage = '_metaverseRegistry must not be 0x0';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            ethers.constants.AddressZero,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period is 0', async () => {
                    const expectedRevertMessage = '_minPeriod must not be 0';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            0,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period is 0', async () => {
                    const expectedRevertMessage = '_maxPeriod must not be 0';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            0,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when min period exceeds max period', async () => {
                    const expectedRevertMessage = '_minPeriod more than _maxPeriod';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            maxPeriod,
                            minPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when max period exceeds max future time', async () => {
                    const expectedRevertMessage = '_maxPeriod more than _maxFutureTime';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxFutureTime,
                            maxPeriod,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registry is not supported', async () => {
                    const expectedRevertMessage = '_registry not supported';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            artificialRegistry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token is not supported', async () => {
                    const expectedRevertMessage = 'payment type not supported';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            mockERC20Registry.address,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list a non-existing metaverse token id', async () => {
                    const invalidTokenId = 1234;
                    const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            invalidTokenId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to list to a non-contract metaverse registry', async () => {
                    // given:
                    await landWorks.setRegistry(metaverseID, artificialRegistry.address, true);

                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            artificialRegistry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.reverted;
                });

                it('should revert when caller is not approved for the to-be-listed asset', async () => {
                    // given:
                    const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';

                    await mockERC721Registry.setApprovalForAll(landWorks.address, false);

                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when caller is not owner of the to-be-listed asset', async () => {
                    const expectedRevertMessage = 'ERC721: transfer of token that is not own';

                    // when:
                    await expect(landWorks
                        .connect(administrativeConsumer)
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            ethers.constants.AddressZero
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';

                    // when:
                    await expect(landWorks
                        .listAndSetAdminConsumer(
                            metaverseID,
                            mockERC721Registry.address,
                            secondMetaverseTokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            nonOwner.address
                        ))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('withdrawing and listing again should not get the old token id for the latest asset', async () => {
                    const newlyGeneratedTokenId = 2;
                    // given:
                    await landWorks.listAndSetAdminConsumer(metaverseID, mockERC721Registry.address, secondMetaverseTokenID, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);
                    await landWorks.delist(assetId);

                    // when:
                    await landWorks.listAndSetAdminConsumer(metaverseID, mockERC721Registry.address, secondMetaverseTokenID, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                    // then:
                    await expect(landWorks.ownerOf(assetId)).to.be.revertedWith('ERC721: owner query for nonexistent token');
                    // and:
                    expect(await mockERC721Registry.ownerOf(secondMetaverseTokenID)).to.equal(landWorks.address);
                    expect(await landWorks.ownerOf(newlyGeneratedTokenId)).to.be.equal(owner.address);
                    // and:
                    const asset = await landWorks.assetAt(newlyGeneratedTokenId);
                    expect(asset.metaverseId).to.equal(metaverseID);
                    expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
                    expect(asset.metaverseAssetId).to.equal(secondMetaverseTokenID);
                    expect(asset.paymentToken).to.equal(ADDRESS_ONE);
                    expect(asset.minPeriod).to.equal(minPeriod);
                    expect(asset.maxPeriod).to.equal(maxPeriod);
                    expect(asset.maxFutureTime).to.equal(maxFutureTime);
                    expect(asset.pricePerSecond).equal(pricePerSecond);
                    expect(asset.status).to.equal(0); // Listed
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(2);
                    expect(await landWorks.tokenOfOwnerByIndex(owner.address, 1)).to.equal(newlyGeneratedTokenId);
                    expect(await landWorks.tokenByIndex(1)).to.equal(newlyGeneratedTokenId);
                });
            });

            describe('rentWithConsumer', async () => {
                it('should successfully rent with consumer', async () => {
                    // given:
                    const beforeBalance = await nonOwner.getBalance();
                    const beforeMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    const expectedRentId = 1;

                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                    const receipt = await tx.wait();
                    const timestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

                    // then:
                    const rent = await landWorks.rentAt(assetId, rentId);
                    expect(rent.start).to.equal(timestamp);
                    expect(rent.end).to.equal(rent.start.add(minPeriod));
                    expect(rent.renter).to.equal(nonOwner.address);
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.totalRents).to.equal(1);
                    // and:
                    const protocolFees = await landWorks.protocolFeeFor(ADDRESS_ONE);
                    expect(protocolFees).to.equal(expectedProtocolFee);
                    // and:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await nonOwner.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).sub(value));
                    // and:
                    const afterMarketplaceBalance = await ethers.provider.getBalance(landWorks.address);
                    expect(afterMarketplaceBalance).to.be.equal(beforeMarketplaceBalance.add(value));
                    // and:
                    const consumer = await landWorks.rentConsumer(assetId, expectedRentId);
                    expect(consumer).to.equal(nonOwner.address);
                    // and:
                    const tokenId = (await landWorks.assetAt(assetId)).metaverseAssetId;
                    expect(await metaverseAdapter.consumerOf(tokenId)).to.equal(nonOwner.address);
                });

                it('should emit event with args', async () => {
                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });
                    const receipt = await tx.wait();
                    // then:
                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + minPeriod;

                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                });

                it('should not update adapter when rent does not begin in execution', async () => {
                    // given:
                    const secondRentId = 2;
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, 2 * minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value * 2, ethers.constants.AddressZero, { value: value * 2 });

                    // when:
                    const tx = await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, artificialRegistry.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                    // then:
                    const start = await (await landWorks.rentAt(assetId, rentId)).end;
                    const end = start.add(minPeriod);

                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, secondRentId, nonOwner.address, start, end, ADDRESS_ONE, expectedRentFee, expectedProtocolFee)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, secondRentId, artificialRegistry.address)
                        .to.not.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, secondRentId, artificialRegistry.address)
                        .to.not.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(nonOwner.address);
                });

                it('should revert when consumer is 0x0', async () => {
                    // given:
                    const expectedRevertMessage = '_consumer must not be 0x0';

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, ethers.constants.AddressZero, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when asset is not found', async () => {
                    // given:
                    const invalidNftId = 123;
                    const expectedRevertMessage = '_assetId not found';

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(invalidNftId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to rent a delisted asset', async () => {
                    // given:
                    const expectedRevertMessage = '_assetId not listed';
                    const amount = maxPeriod * pricePerSecond;
                    // and:
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                    // and:
                    await landWorks.delist(assetId);

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when period is less than asset min period', async () => {
                    // given:
                    const expectedRevertMessage = '_period less than minPeriod';

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(assetId, 0, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when period is more than asset max period', async () => {
                    // given:
                    const expectedRevertMessage = '_period more than maxPeriod';

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(assetId, maxPeriod + 1, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when current rents are more than asset maxFutureTime', async () => {
                    // given:
                    const expectedRevertMessage = 'rent more than current maxFutureTime';
                    const amount = maxPeriod * pricePerSecond;
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                    // When executing with this period, it will be more than block.timestamp + maxFutureTime
                    const exceedingPeriod = maxFutureTime - maxPeriod + 2;

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, exceedingPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, exceedingPeriod * pricePerSecond, ethers.constants.AddressZero, { value: exceedingPeriod * pricePerSecond }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when msg.value is invalid', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid msg.value';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when rent start exceeds max rent start provided', async () => {
                    // given:
                    const exceededMaxStart = Math.round((Date.now() - 1_000) / 1000);
                    const expectedRevertMessage = 'rent start exceeds maxRentStart';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, exceededMaxStart, owner.address, ADDRESS_ONE, minPeriod * pricePerSecond, ethers.constants.AddressZero, { value: minPeriod * pricePerSecond }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when payment token mismatches actual payment token for the asset', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid _paymentToken';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, owner.address, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when provided amount and actual payment amount mismatch', async () => {
                    // given:
                    const expectedRevertMessage = 'invalid _amount';

                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value * 2, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                    // and:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, 0, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when trying to update adapter which does not implement setConsumer', async () => {
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, landRegistry.address);
                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.reverted;
                });

                it('should revert when adapter is not set for landworks', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [owner.address, mockERC721Registry.address]);
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);
                    // and:
                    const expectedRevertMessage = 'ConsumableAdapter: sender is not LandWorks';

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when adapter is not set for the metaverse registry', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, owner.address]);
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);

                    // when:
                    await expect(landWorks
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, owner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value }))
                        .to.be.reverted;
                });
            });

            describe('updateAdapterState', async () => {
                it('should successfully update adapter for rent', async () => {
                    // given:
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, 5, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 5 * value, ethers.constants.AddressZero, { value: 5 * value });
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(nonOwner.address);
                    // and:
                    await landWorks.connect(nonOwner).updateConsumer(assetId, rentId, artificialRegistry.address);

                    // when:
                    await landWorks.updateAdapterState(assetId, rentId);

                    // then:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(artificialRegistry.address);
                });

                it('should emit events with args', async () => {
                    // given:
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, 5, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 5 * value, ethers.constants.AddressZero, { value: 5 * value });
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(nonOwner.address);
                    // and:
                    await landWorks.connect(nonOwner).updateConsumer(assetId, rentId, artificialRegistry.address);

                    // when:
                    await expect(landWorks.updateAdapterState(assetId, rentId))
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, artificialRegistry.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, artificialRegistry.address, tokenID);
                });

                it('should revert if asset does not exist', async () => {
                    // given:
                    const invalidNftId = 123;
                    const expectedRevertMessage = '_assetId not found';

                    // when:
                    await expect(landWorks
                        .updateAdapterState(invalidNftId, rentId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if it is not rent\'s period', async () => {
                    // given:
                    const expectedRevertMessage = 'block timestamp less than rent start';
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, 3, MAX_RENT_START, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });
                    // and:
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, 2, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 2 * value, ethers.constants.AddressZero, { value: 2 * value });

                    // when:
                    await expect(landWorks.updateAdapterState(assetId, 2))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if the rent has expired', async () => {
                    // given:
                    const expectedRevertMessage = 'block timestamp more than or equal to rent end';
                    // and:
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                    // when:
                    await expect(landWorks.updateAdapterState(assetId, rentId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if adapter does not implement setConsumer', async () => {
                    // given:
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, 3, MAX_RENT_START, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });
                    // and:
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, mockERC721Registry.address);

                    // when:
                    await expect(landWorks.updateAdapterState(assetId, rentId))
                        .to.be.reverted;
                });

                it('should revert when adapter is not set for landworks', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [owner.address, mockERC721Registry.address]);
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, 3, MAX_RENT_START, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);
                    // and:
                    const expectedRevertMessage = 'ConsumableAdapter: sender is not LandWorks';

                    // when:
                    await expect(landWorks
                        .updateAdapterState(assetId, rentId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when adapter is not set for the metaverse registry', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, owner.address]);
                    await landWorks
                        .connect(nonOwner)
                        .rent(assetId, 3, MAX_RENT_START, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);

                    // when:
                    await expect(landWorks
                        .updateAdapterState(assetId, rentId))
                        .to.be.reverted;
                });
            });

            describe('updateConsumer', async () => {
                it('should successfully update consumer', async () => {
                    // given:
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                    // when:
                    await landWorks.connect(nonOwner).updateConsumer(assetId, rentId, artificialRegistry.address);

                    // then:
                    expect(await landWorks.rentConsumer(assetId, rentId)).to.equal(artificialRegistry.address);
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(nonOwner.address);
                });

                it('should emit event with args', async () => {
                    // given:
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, ethers.constants.AddressZero, { value });

                    // when:
                    await expect(landWorks.connect(nonOwner)
                        .updateConsumer(assetId, rentId, artificialRegistry.address))
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, artificialRegistry.address)
                        .to.not.emit(landWorks, 'UpdateAdapterConsumer')
                        .to.not.emit(metaverseAdapter, 'ConsumerChanged');
                });

                it('should revert when consumer is 0x0', async () => {
                    const expectedRevertMessage = '_newConsumer must not be 0x0';
                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateConsumer(assetId, rentId, ethers.constants.AddressZero))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if asset does not exist', async () => {
                    const invalidAssetId = 213;
                    const expectedRevertMessage = '_assetId not found';
                    // when:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateConsumer(invalidAssetId, rentId, nonOwner.address))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when caller is not renter', async () => {
                    const expectedRevertMessage = 'caller is not renter';
                    // when:
                    await expect(landWorks
                        .updateConsumer(assetId, rentId, nonOwner.address))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });

            describe('updateAdapterAdministrativeState', async () => {
                beforeEach(async () => {
                    await landWorks.setAdministrativeConsumerFor(mockERC721Registry.address, administrativeConsumer.address);
                });

                it('should successfully update adapter with administrative consumer', async () => {
                    // given:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);

                    // when:
                    await landWorks.updateAdapterAdministrativeState(assetId);

                    // then:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(administrativeConsumer.address);
                });

                it('should emit events with args', async () => {
                    // then:
                    await expect(landWorks
                        .connect(nonOwner)
                        .updateAdapterAdministrativeState(assetId))
                        .to.emit(landWorks, 'UpdateAdapterAdministrativeConsumer')
                        .withArgs(assetId, metaverseAdapter.address, administrativeConsumer.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, administrativeConsumer.address, tokenID);
                });

                it('should revert if asset does not exist', async () => {
                    // given:
                    const invalidNftId = 123;
                    const expectedRevertMessage = '_assetId not found';

                    // when:
                    await expect(landWorks
                        .updateAdapterAdministrativeState(invalidNftId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if there is an active rent', async () => {
                    // given:
                    const expectedRevertMessage = '_assetId has an active rent';
                    await landWorks
                        .connect(nonOwner)
                        .rentWithConsumer(assetId, 3, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, 3 * value, ethers.constants.AddressZero, { value: 3 * value });

                    // when:
                    await expect(landWorks
                        .updateAdapterAdministrativeState(assetId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert if adapter does not implement setConsumer', async () => {
                    // given:
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, mockERC721Registry.address);

                    // when:
                    await expect(landWorks
                        .updateAdapterAdministrativeState(assetId))
                        .to.be.reverted;
                });

                it('should revert when adapter is not set for landworks', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [owner.address, mockERC721Registry.address]);
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);
                    // and:
                    const expectedRevertMessage = 'ConsumableAdapter: sender is not LandWorks';

                    // when:
                    await expect(landWorks
                        .updateAdapterAdministrativeState(assetId))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when adapter is not set for the metaverse registry', async () => {
                    // given:
                    const invalidMetaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, owner.address]);
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, invalidMetaverseAdapter.address);

                    // when:
                    await expect(landWorks
                        .updateAdapterAdministrativeState(assetId))
                        .to.be.reverted;
                });
            });

            describe('delist', async () => {
                it('should successfully delist with withdraw', async () => {
                    // when:
                    await landWorks.delist(assetId);

                    // then:
                    expect(await mockERC721Registry.ownerOf(tokenID)).to.equal(owner.address);
                    await expect(landWorks.ownerOf(assetId))
                        .to.be.revertedWith('ERC721: owner query for nonexistent token');
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(0);
                    expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                    expect(asset.metaverseAssetId).to.equal(0);
                    expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                    expect(asset.minPeriod).to.equal(0);
                    expect(asset.maxPeriod).to.equal(0);
                    expect(asset.maxFutureTime).to.equal(0);
                    expect(asset.pricePerSecond).equal(0);
                    expect(asset.status).to.equal(0);
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(0);
                    await expect(landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.be.revertedWith('ERC721Enumerable: owner index out of bounds');
                    await expect(landWorks.tokenByIndex(0)).to.be.revertedWith('ERC721Enumerable: global index out of bounds');
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                });

                it('should emit events with args', async () => {
                    // when:
                    await expect(landWorks
                        .delist(assetId))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Delist')
                        .withArgs(assetId, owner.address)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                        .to.emit(mockERC721Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, tokenID)
                        .to.emit(landWorks, 'Withdraw')
                        .withArgs(assetId, owner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, ethers.constants.AddressZero, tokenID);
                });

                it('should revert when adapter does not implement setConsumer', async () => {
                    // given:
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, mockERC721Registry.address);

                    // when:
                    await expect(landWorks.delist(assetId))
                        .to.be.reverted;
                });
            });

            describe('withdraw', async () => {
                const period = 2;
                const amount = pricePerSecond * period;

                beforeEach(async () => {
                    // given:
                    await landWorks.connect(nonOwner).rentWithConsumer(assetId, period, MAX_RENT_START, owner.address, ADDRESS_ONE, amount, ethers.constants.AddressZero, { value: amount });
                });

                it('should withdraw successfully', async () => {
                    // given:
                    await landWorks.delist(assetId);

                    // when:
                    await landWorks.withdraw(assetId);

                    // then:
                    expect(await mockERC721Registry.ownerOf(tokenID)).to.equal(owner.address);
                    await expect(landWorks.ownerOf(assetId))
                        .to.be.revertedWith('ERC721: owner query for nonexistent token');
                    // and:
                    const asset = await landWorks.assetAt(assetId);
                    expect(asset.metaverseId).to.equal(0);
                    expect(asset.metaverseRegistry).to.equal(ethers.constants.AddressZero);
                    expect(asset.metaverseAssetId).to.equal(0);
                    expect(asset.paymentToken).to.equal(ethers.constants.AddressZero);
                    expect(asset.minPeriod).to.equal(0);
                    expect(asset.maxPeriod).to.equal(0);
                    expect(asset.maxFutureTime).to.equal(0);
                    expect(asset.pricePerSecond).equal(0);
                    expect(asset.status).to.equal(0);
                    expect(asset.totalRents).to.equal(0);
                    expect(await landWorks.totalSupply()).to.equal(0);
                    await expect(landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.be.revertedWith('ERC721Enumerable: owner index out of bounds');
                    await expect(landWorks.tokenByIndex(0)).to.be.revertedWith('ERC721Enumerable: global index out of bounds');
                    // and:
                    expect(await metaverseAdapter.consumerOf(tokenID)).to.equal(ethers.constants.AddressZero);
                });

                it('should emit events with args', async () => {
                    // given:
                    await landWorks.delist(assetId);

                    // when:
                    await expect(landWorks
                        .withdraw(assetId))
                        .to.emit(landWorks, 'ConsumerChanged')
                        .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'Transfer')
                        .withArgs(owner.address, ethers.constants.AddressZero, assetId)
                        .to.emit(landWorks, 'ClaimRentFee')
                        .withArgs(assetId, ADDRESS_ONE, owner.address, amount - Math.floor((amount * FEE_PERCENTAGE) / FEE_PRECISION))
                        .to.emit(mockERC721Registry, 'Transfer')
                        .withArgs(landWorks.address, owner.address, tokenID)
                        .to.emit(landWorks, 'Withdraw')
                        .withArgs(assetId, owner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, ethers.constants.AddressZero, tokenID);
                });

                it('should revert when adapter does not implement setConsumer', async () => {
                    // given:
                    await landWorks.connect(nonOwner).rentWithConsumer(assetId, 1, MAX_RENT_START, owner.address, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, mockERC721Registry.address);

                    // when:
                    await expect(landWorks.withdraw(assetId))
                        .to.be.reverted;
                });
            });
        });

        describe('Diamond cut MetaverseAdditionFacet', async () => {
            let metaverseAdditionFacet: Contract;
            let metaverseAdditionFacetAddress: string;

            const allInOneMetaverseId = 5;
            const allInOneMetaverseName = 'All in one';
            let allInOneMetaverseRegistries: any[] = [];
            let allInOneAdministrativeConsumers: any[] = [];

            beforeEach(async () => {
                const facet = await Deployer.deployContract('MetaverseAdditionFacet');
                metaverseAdditionFacetAddress = facet.address;

                const diamondAddFacet = [
                    {
                        facetAddress: facet.address,
                        action: FacetCutAction.Add,
                        functionSelectors: Diamond.getSelectorsFor(facet)
                    }
                ];

                const signers = await ethers.getSigners();
                allInOneMetaverseRegistries = [signers[6].address, signers[7].address];
                allInOneAdministrativeConsumers = [signers[8].address, signers[9].address];

                await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");
                metaverseAdditionFacet = await ethers.getContractAt('MetaverseAdditionFacet', landWorks.address);
            });

            it('should have 10 facets', async () => {
                const actualFacets = await landWorks.facetAddresses();
                expect(actualFacets.length).to.be.equal(10);
                expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address, marketplace.address, rent.address, fee.address, erc721.address, decentraland.address, metaverseConsumableAdapterFacet.address, metaverseAdditionFacetAddress]);
            });

            it('should have correct function selectors linked to facet', async function () {
                const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
                expect(await landWorks.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

                const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
                expect(await landWorks.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

                const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
                expect(await landWorks.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);

                const actualMarketplaceSelectors = Diamond.getSelectorsFor(marketplace);
                expect(await landWorks.facetFunctionSelectors(marketplace.address)).to.deep.equal(actualMarketplaceSelectors);

                const actualFeeSelectors = Diamond.getSelectorsFor(fee);
                expect(await landWorks.facetFunctionSelectors(fee.address)).to.deep.equal(actualFeeSelectors);

                const actualErc721Selectors = Diamond.getSelectorsFor(erc721);
                expect(await landWorks.facetFunctionSelectors(erc721.address)).to.deep.equal(actualErc721Selectors);

                const actualDecentralandFacetSelectors = Diamond.getSelectorsFor(decentraland);
                expect(await landWorks.facetFunctionSelectors(decentraland.address)).to.deep.equal(actualDecentralandFacetSelectors);

                const actualMetaverseConsumableAdapterFacetSelectors = Diamond.getSelectorsFor(metaverseConsumableAdapterFacet);
                expect(await landWorks.facetFunctionSelectors(metaverseConsumableAdapterFacet.address)).to.deep.equal(actualMetaverseConsumableAdapterFacetSelectors);

                const actualMetaverseAdditionFacetAddresses = Diamond.getSelectorsFor(metaverseAdditionFacet);
                expect(await landWorks.facetFunctionSelectors(metaverseAdditionFacetAddress)).to.deep.equal(actualMetaverseAdditionFacetAddresses);
            });

            it('should associate selectors correctly to facets', async function () {
                for (const sel of Diamond.getSelectorsFor(loupe)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(loupe.address);
                }

                for (const sel of Diamond.getSelectorsFor(cut)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(cut.address);
                }

                for (const sel of Diamond.getSelectorsFor(ownership)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(ownership.address);
                }

                for (const sel of Diamond.getSelectorsFor(marketplace)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(marketplace.address);
                }

                for (const sel of Diamond.getSelectorsFor(fee)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(fee.address);
                }

                for (const sel of Diamond.getSelectorsFor(erc721)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(erc721.address);
                }

                for (const sel of Diamond.getSelectorsFor(decentraland)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(decentraland.address);
                }

                for (const sel of Diamond.getSelectorsFor(metaverseConsumableAdapterFacet)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(metaverseConsumableAdapterFacet.address);
                }

                for (const sel of Diamond.getSelectorsFor(metaverseAdditionFacet)) {
                    expect(await landWorks.facetAddress(sel)).to.be.equal(metaverseAdditionFacetAddress);
                }
            });

            it('should return correct response when facets() is called', async function () {
                const facets = await landWorks.facets();

                expect(facets[0].facetAddress).to.equal(cut.address);
                expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

                expect(facets[1].facetAddress).to.equal(loupe.address);
                expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

                expect(facets[2].facetAddress).to.equal(ownership.address);
                expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));

                expect(facets[3].facetAddress).to.equal(marketplace.address);
                expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(marketplace));

                expect(facets[4].facetAddress).to.equal(rent.address);
                expect(facets[4].functionSelectors).to.eql(Diamond.getSelectorsFor(rent));

                expect(facets[5].facetAddress).to.equal(fee.address);
                expect(facets[5].functionSelectors).to.eql(Diamond.getSelectorsFor(fee));

                expect(facets[6].facetAddress).to.equal(erc721.address);
                expect(facets[6].functionSelectors).to.eql(Diamond.getSelectorsFor(erc721));

                expect(facets[7].facetAddress).to.equal(decentraland.address);
                expect(facets[7].functionSelectors).to.eql(Diamond.getSelectorsFor(decentraland));

                expect(facets[8].facetAddress).to.equal(metaverseConsumableAdapterFacet.address);
                expect(facets[8].functionSelectors).to.eql(Diamond.getSelectorsFor(metaverseConsumableAdapterFacet));

                expect(facets[9].facetAddress).to.equal(metaverseAdditionFacetAddress);
                expect(facets[9].functionSelectors).to.eql(Diamond.getSelectorsFor(metaverseAdditionFacet));
            });

            describe('addMetaverseWithAdapters', async () => {
                it('should successfully add metaverse through MetaverseAdditionFacet', async () => {
                    // when:
                    await metaverseAdditionFacet.addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers);
                    // then:
                    expect(await landWorks.metaverseName(allInOneMetaverseId)).to.equal(allInOneMetaverseName);
                    expect(await landWorks.totalRegistries(allInOneMetaverseId)).to.equal(allInOneMetaverseRegistries.length);
                    for (let i = 0; i < allInOneMetaverseRegistries.length; i++) {
                        expect(await landWorks.registryAt(allInOneMetaverseId, i)).to.equal(allInOneMetaverseRegistries[i]);
                        expect(await landWorks.administrativeConsumer(allInOneMetaverseRegistries[i])).to.equal(allInOneAdministrativeConsumers[i]);

                        const consumableAdapter = await landWorks.consumableAdapter(allInOneMetaverseRegistries[i]);
                        const adapter = await ethers.getContractAt('ConsumableAdapterV1', consumableAdapter);

                        expect(await adapter.landworks()).to.equal(landWorks.address);
                        expect(await adapter.token()).to.equal(allInOneMetaverseRegistries[i]);
                    }
                });

                it('should emit events with args', async () => {
                    // when:
                    const tx = await metaverseAdditionFacet.addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers);

                    await expect(tx)
                        .to.emit(landWorks, 'SetMetaverseName')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseName)
                        .to.emit(landWorks, 'SetRegistry')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseRegistries[0], true)
                        .to.emit(landWorks, 'ConsumableAdapterUpdated')
                        .to.emit(landWorks, 'AdministrativeConsumerUpdated')
                        .withArgs(allInOneMetaverseRegistries[0], allInOneAdministrativeConsumers[0])
                        .to.emit(landWorks, 'SetRegistry')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseRegistries[1], true)
                        .to.emit(landWorks, 'ConsumableAdapterUpdated')
                        .to.emit(landWorks, 'AdministrativeConsumerUpdated')
                        .withArgs(allInOneMetaverseRegistries[1], allInOneAdministrativeConsumers[1])
                });

                it('should revert when caller is not owner', async () => {
                    const expectedRevertMessage = 'Must be contract owner';
                    // when:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registry is 0x0', async () => {
                    // given:
                    const expectedRevertMessage = '_metaverseRegistry must not be 0x0';

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, [...allInOneMetaverseRegistries, ethers.constants.AddressZero], [...allInOneAdministrativeConsumers, ethers.constants.AddressZero]))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registries and administrative consumers mismatch', async () => {
                    const expectedRevertMessage = 'invalid metaverse registries and operators length';
                    await landWorks.setRegistry(allInOneMetaverseId, allInOneMetaverseRegistries[0], true);

                    // when:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, []))
                        .to.be.revertedWith(expectedRevertMessage);
                    // and:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, [], allInOneAdministrativeConsumers))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when metaverse name is already set', async () => {
                    // given:
                    const expectedRevertMessage = 'metaverse name already set';
                    await landWorks.setMetaverseName(allInOneMetaverseId, metaverseName);

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers)
                    ).to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when metaverse registries already exist', async () => {
                    // given:
                    const expectedRevertMessage = 'metaverse registries already exist';
                    await landWorks.setRegistry(allInOneMetaverseId, administrativeConsumer.address, true);

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers)
                    ).to.be.revertedWith(expectedRevertMessage);
                });
            });

            describe('addMetaverseWithoutAdapters', async () => {
                it('should successfully add metaverse without adapters through MetaverseAdditionFacet', async () => {
                    // when:
                    await metaverseAdditionFacet.addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers);
                    // then:
                    expect(await landWorks.metaverseName(allInOneMetaverseId)).to.equal(allInOneMetaverseName);
                    expect(await landWorks.totalRegistries(allInOneMetaverseId)).to.equal(allInOneMetaverseRegistries.length);
                    for (let i = 0; i < allInOneMetaverseRegistries.length; i++) {
                        expect(await landWorks.registryAt(allInOneMetaverseId, i)).to.equal(allInOneMetaverseRegistries[i]);
                        expect(await landWorks.administrativeConsumer(allInOneMetaverseRegistries[i])).to.equal(allInOneAdministrativeConsumers[i]);
                        expect(await landWorks.consumableAdapter(allInOneMetaverseRegistries[i])).to.equal(allInOneMetaverseRegistries[i]);
                    }
                });

                it('should emit events with args', async () => {
                    // when:
                    const tx = await metaverseAdditionFacet.addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers);

                    await expect(tx)
                        .to.emit(landWorks, 'SetMetaverseName')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseName)
                        .to.emit(landWorks, 'SetRegistry')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseRegistries[0], true)
                        .to.emit(landWorks, 'ConsumableAdapterUpdated')
                        .withArgs(allInOneMetaverseRegistries[0], allInOneMetaverseRegistries[0])
                        .to.emit(landWorks, 'AdministrativeConsumerUpdated')
                        .withArgs(allInOneMetaverseRegistries[0], allInOneAdministrativeConsumers[0])
                        .to.emit(landWorks, 'SetRegistry')
                        .withArgs(allInOneMetaverseId, allInOneMetaverseRegistries[1], true)
                        .to.emit(landWorks, 'ConsumableAdapterUpdated')
                        .withArgs(allInOneMetaverseRegistries[1], allInOneMetaverseRegistries[1])
                        .to.emit(landWorks, 'AdministrativeConsumerUpdated')
                        .withArgs(allInOneMetaverseRegistries[1], allInOneAdministrativeConsumers[1])
                });

                it('should revert when caller is not owner', async () => {
                    const expectedRevertMessage = 'Must be contract owner';
                    // when:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registry is 0x0', async () => {
                    // given:
                    const expectedRevertMessage = '_metaverseRegistry must not be 0x0';

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, [...allInOneMetaverseRegistries, ethers.constants.AddressZero], [...allInOneAdministrativeConsumers, ethers.constants.AddressZero]))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when registries and administrative consumers mismatch', async () => {
                    const expectedRevertMessage = 'invalid metaverse registries and operators length';
                    await landWorks.setRegistry(allInOneMetaverseId, allInOneMetaverseRegistries[0], true);

                    // when:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, []))
                        .to.be.revertedWith(expectedRevertMessage);
                    // and:
                    await expect(metaverseAdditionFacet
                        .connect(nonOwner)
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, [], allInOneAdministrativeConsumers))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when metaverse name is already set', async () => {
                    // given:
                    const expectedRevertMessage = 'metaverse name already set';
                    await landWorks.setMetaverseName(allInOneMetaverseId, metaverseName);

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers)
                    ).to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when metaverse registries already exist', async () => {
                    // given:
                    const expectedRevertMessage = 'metaverse registries already exist';
                    await landWorks.setRegistry(allInOneMetaverseId, administrativeConsumer.address, true);

                    // when:
                    await expect(metaverseAdditionFacet
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, allInOneMetaverseRegistries, allInOneAdministrativeConsumers)
                    ).to.be.revertedWith(expectedRevertMessage);
                });

                it('should be able to change the consumer of a metaverse registry which implements ERC721Consumable', async () => {
                    // given:
                    const metaverseRegistry = await Deployer.deployContract('ERC721Consumable');
                    // and:
                    await metaverseAdditionFacet
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, [metaverseRegistry.address], [administrativeConsumer.address]);
                    // and:
                    await metaverseRegistry.mint();
                    // and:
                    await metaverseRegistry.approve(landWorks.address, 1);
                    await landWorks.list(allInOneMetaverseId, metaverseRegistry.address, 1, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

                    // when:
                    await landWorks.connect(nonOwner).rentWithConsumer(1, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, pricePerSecond * maxPeriod, ethers.constants.AddressZero, { value: pricePerSecond * maxPeriod });

                    // then:
                    expect(await landWorks.consumableAdapter(metaverseRegistry.address)).to.equal(metaverseRegistry.address);
                    expect(await metaverseRegistry.consumerOf(1)).to.equal(nonOwner.address);
                });

                it('should clear the consumer of a metaverse registry which implements ERC721Consumable upon withdraw', async () => {
                    // given:
                    const metaverseRegistry = await Deployer.deployContract('ERC721Consumable');
                    // and:
                    await metaverseAdditionFacet
                        .addMetaverseWithoutAdapters(allInOneMetaverseId, allInOneMetaverseName, [metaverseRegistry.address], [administrativeConsumer.address]);
                    // and:
                    await metaverseRegistry.mint();
                    // and:
                    await metaverseRegistry.approve(landWorks.address, 1);
                    await landWorks.list(allInOneMetaverseId, metaverseRegistry.address, 1, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);
                    // and:
                    await landWorks.connect(nonOwner).rentWithConsumer(1, minPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero, { value: pricePerSecond });
                    // and:
                    expect(await landWorks.consumableAdapter(metaverseRegistry.address)).to.equal(metaverseRegistry.address);
                    expect(await metaverseRegistry.consumerOf(1)).to.equal(nonOwner.address);

                    // when:
                    // delist does withdraw in itself
                    await landWorks.delist(1);

                    // then:
                    expect(await metaverseRegistry.consumerOf(1)).to.equal(ethers.constants.AddressZero);
                });
            });
        });
    });

    describe('Diamond cut ReferralFacet', async () => {
        let referralFacet: Contract;

        let mockERC721Registry: Contract;
        const tokenID = 1;
        const metaverseID = 1;
        const metaverseName = 'NoConsumer';
        const minPeriod = 1;
        const maxPeriod = 100;
        const maxFutureTime = 120;
        const pricePerSecond = 1337;
        const value = minPeriod * pricePerSecond;
        const expectedProtocolFee = Math.floor((value * FEE_PERCENTAGE) / FEE_PRECISION);
        const listMainPercentage = 5_000, listSecondaryPercentage = 2_000;
        const rentMainPercentage = 3_000, rentSecondaryPercentage = 4_000;
        const rentId = 1;

        beforeEach(async () => {
            referralFacet = await Deployer.deployContract('ReferralFacet');

            const diamondAddFacet = [
                {
                    facetAddress: referralFacet.address,
                    action: FacetCutAction.Add,
                    functionSelectors: Diamond.getSelectorsFor(referralFacet)
                }
            ];

            await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");
            mockERC721Registry = await Deployer.deployContract('ERC721Mock');
            await mockERC721Registry.mint(owner.address, tokenID);

            await landWorks.setMetaverseName(metaverseID, metaverseName);
            await landWorks.setRegistry(metaverseID, mockERC721Registry.address, true);
        });

        it('should have 9 facets', async () => {
            const actualFacets = await landWorks.facetAddresses();
            expect(actualFacets.length).to.be.equal(9);
            expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address, marketplace.address, rent.address, fee.address, erc721.address, decentraland.address, referralFacet.address]);
        });

        it('should have correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
            expect(await landWorks.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
            expect(await landWorks.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
            expect(await landWorks.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);

            const actualMarketplaceSelectors = Diamond.getSelectorsFor(marketplace);
            expect(await landWorks.facetFunctionSelectors(marketplace.address)).to.deep.equal(actualMarketplaceSelectors);

            const actualFeeSelectors = Diamond.getSelectorsFor(fee);
            expect(await landWorks.facetFunctionSelectors(fee.address)).to.deep.equal(actualFeeSelectors);

            const actualErc721Selectors = Diamond.getSelectorsFor(erc721);
            expect(await landWorks.facetFunctionSelectors(erc721.address)).to.deep.equal(actualErc721Selectors);

            const actualDecentralandFacetSelectors = Diamond.getSelectorsFor(decentraland);
            expect(await landWorks.facetFunctionSelectors(decentraland.address)).to.deep.equal(actualDecentralandFacetSelectors);

            const actualReferralFacetSelectors = Diamond.getSelectorsFor(referralFacet);
            expect(await landWorks.facetFunctionSelectors(referralFacet.address)).to.deep.equal(actualReferralFacetSelectors);
        });

        it('should associate selectors correctly to facets', async function () {
            for (const sel of Diamond.getSelectorsFor(loupe)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(loupe.address);
            }

            for (const sel of Diamond.getSelectorsFor(cut)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(cut.address);
            }

            for (const sel of Diamond.getSelectorsFor(ownership)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(ownership.address);
            }

            for (const sel of Diamond.getSelectorsFor(marketplace)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(marketplace.address);
            }

            for (const sel of Diamond.getSelectorsFor(fee)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(fee.address);
            }

            for (const sel of Diamond.getSelectorsFor(erc721)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(erc721.address);
            }

            for (const sel of Diamond.getSelectorsFor(decentraland)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(decentraland.address);
            }

            for (const sel of Diamond.getSelectorsFor(referralFacet)) {
                expect(await landWorks.facetAddress(sel)).to.be.equal(referralFacet.address);
            }
        });

        it('should return correct response when facets() is called', async function () {
            const facets = await landWorks.facets();

            expect(facets[0].facetAddress).to.equal(cut.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

            expect(facets[1].facetAddress).to.equal(loupe.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

            expect(facets[2].facetAddress).to.equal(ownership.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));

            expect(facets[3].facetAddress).to.equal(marketplace.address);
            expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(marketplace));

            expect(facets[4].facetAddress).to.equal(rent.address);
            expect(facets[4].functionSelectors).to.eql(Diamond.getSelectorsFor(rent));

            expect(facets[5].facetAddress).to.equal(fee.address);
            expect(facets[5].functionSelectors).to.eql(Diamond.getSelectorsFor(fee));

            expect(facets[6].facetAddress).to.equal(erc721.address);
            expect(facets[6].functionSelectors).to.eql(Diamond.getSelectorsFor(erc721));

            expect(facets[7].facetAddress).to.equal(decentraland.address);
            expect(facets[7].functionSelectors).to.eql(Diamond.getSelectorsFor(decentraland));

            expect(facets[8].facetAddress).to.equal(referralFacet.address);
            expect(facets[8].functionSelectors).to.eql(Diamond.getSelectorsFor(referralFacet));
        });

        describe('setReferralAdmin', async () => {
            it('should set admin successfully', async () => {
                // given:
                expect(await landWorks.referralAdmin()).to.equal(ethers.constants.AddressZero);

                // when:
                await landWorks.setReferralAdmin(nonOwner.address);

                // then:

                expect(await landWorks.referralAdmin()).to.equal(nonOwner.address);
            });

            it('should emit event with args', async () => {
                await expect(landWorks.setReferralAdmin(nonOwner.address))
                    .to.emit(landWorks, 'SetReferralAdmin')
                    .withArgs(nonOwner.address);
            });

            it('should revert when caller is not owner', async () => {
                const expectedRevertMessage = 'Must be contract owner';
                // when:
                await expect(landWorks.connect(nonOwner).setReferralAdmin(nonOwner.address))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('setReferrers', async () => {
            beforeEach(async () => {
                await landWorks.setReferralAdmin(nonOwner.address);
            });

            it('should successfully set referrer', async () => {
                // when:
                await landWorks
                    .setReferrers(
                        [listReferrer.address],
                        [listMainPercentage],
                        [listSecondaryPercentage]
                    );

                // then:
                const [listReferrerMain, listReferrerSecondary] = await landWorks.referrerPercentage(listReferrer.address);
                expect(listReferrerMain).to.equal(listMainPercentage);
                expect(listReferrerSecondary).to.equal(listSecondaryPercentage);
            });

            it('should emit event with args', async () => {
                // when:
                await expect(
                    landWorks
                        .setReferrers(
                            [listReferrer.address],
                            [listMainPercentage],
                            [listSecondaryPercentage]
                        )
                )
                    .to.emit(landWorks, 'SetReferrer')
                    .withArgs(
                        listReferrer.address,
                        listMainPercentage,
                        listSecondaryPercentage);
            });

            it('should successfully set multiple referrers', async () => {
                // when:
                await expect(
                    landWorks
                        .setReferrers(
                            [listReferrer.address, rentReferrer.address],
                            [listMainPercentage, rentMainPercentage],
                            [listSecondaryPercentage, rentSecondaryPercentage]
                        )
                )
                    .to.emit(landWorks, 'SetReferrer')
                    .withArgs(
                        listReferrer.address,
                        listMainPercentage,
                        listSecondaryPercentage)
                    .to.emit(landWorks, 'SetReferrer')
                    .withArgs(
                        rentReferrer.address,
                        rentMainPercentage,
                        rentSecondaryPercentage);

                // then:
                const [listReferrerMain, listReferrerSecondary] = await landWorks.referrerPercentage(listReferrer.address);
                expect(listReferrerMain).to.equal(listMainPercentage);
                expect(listReferrerSecondary).to.equal(listSecondaryPercentage);

                const [rentReferrerMain, rentReferrerSecondary] = await landWorks.referrerPercentage(rentReferrer.address);
                expect(rentReferrerMain).to.equal(rentMainPercentage);
                expect(rentReferrerSecondary).to.equal(rentSecondaryPercentage);
            });

            it('should revert when referrer main percentage exceeds 50', async () => {
                // given:
                const expectedRevertMessage = '_percentage cannot exceed 50';
                // when:
                await expect(landWorks.setReferrers([listReferrer.address], [5_001], [10_000]))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 5_001], [10_000, 0]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when referrer secondary percentage exceeds 100', async () => {
                // given:
                const expectedRevertMessage = '_secondaryPercentage cannot exceed 100';
                // when:
                await expect(landWorks.connect(nonOwner).setReferrers([listReferrer.address], [3_000], [10_001]))
                    .to.be.revertedWith(expectedRevertMessage);
                // and:
                await expect(landWorks.connect(nonOwner).setReferrers([listReferrer.address, rentReferrer.address], [5_000, 5_000], [3_000, 10_001]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when referrer is 0x0', async () => {
                const expectedRevertMessage = '_referrer cannot be 0x0';
                // when:
                await expect(landWorks.setReferrers([ethers.constants.AddressZero], [3_000], [3_000]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner, nor referral admin', async () => {
                const expectedRevertMessage = 'caller is neither admin, nor owner';
                // when:
                await expect(landWorks.connect(consumer).setReferrers([nonOwner.address], [3_000], [3_000]))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('setMetaverseRegistryReferrers', async () => {
            beforeEach(async () => {
                await landWorks.setReferralAdmin(nonOwner.address);
            });

            it('should successfully set referrer', async () => {
                // when:
                await landWorks
                    .setMetaverseRegistryReferrers(
                        [mockERC721Registry.address],
                        [listReferrer.address],
                        [listMainPercentage]
                    );

                // then:
                const [referrer, percentage] = await landWorks.metaverseRegistryReferrer(mockERC721Registry.address);
                expect(referrer).to.equal(listReferrer.address);
                expect(percentage).to.equal(listMainPercentage);
            });

            it('should emit event with args', async () => {
                // when:
                await expect(
                    landWorks
                        .setMetaverseRegistryReferrers(
                            [mockERC721Registry.address],
                            [listReferrer.address],
                            [listMainPercentage]
                        )
                )
                    .to.emit(landWorks, 'SetMetaverseRegistryReferrer')
                    .withArgs(
                        mockERC721Registry.address,
                        listReferrer.address,
                        listMainPercentage);
            });

            it('should successfully set multiple referrers', async () => {
                // when:
                await expect(
                    landWorks
                        .setMetaverseRegistryReferrers(
                            [mockERC721Registry.address, ADDRESS_ONE],
                            [listReferrer.address, listReferrer.address],
                            [listMainPercentage, listSecondaryPercentage]
                        )
                )
                    .to.emit(landWorks, 'SetMetaverseRegistryReferrer')
                    .withArgs(
                        mockERC721Registry.address,
                        listReferrer.address,
                        listMainPercentage)
                    .to.emit(landWorks, 'SetMetaverseRegistryReferrer')
                    .withArgs(
                        ADDRESS_ONE,
                        listReferrer.address,
                        listSecondaryPercentage);

                // then:
                let [referrer, percentage] = await landWorks.metaverseRegistryReferrer(mockERC721Registry.address);
                expect(referrer).to.equal(listReferrer.address);
                expect(percentage).to.equal(listMainPercentage);

                [referrer, percentage] = await landWorks.metaverseRegistryReferrer(ADDRESS_ONE);
                expect(referrer).to.equal(listReferrer.address);
                expect(percentage).to.equal(listSecondaryPercentage);
            });

            it('should revert when referrer secondary percentage exceeds 100', async () => {
                // given:
                const expectedRevertMessage = '_percentage cannot exceed 100';
                // when:
                await expect(landWorks.connect(nonOwner).setMetaverseRegistryReferrers([mockERC721Registry.address], [listReferrer.address], [10_001]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when metaverse registry is 0x0', async () => {
                const expectedRevertMessage = '_metaverseRegistry cannot be 0x0';
                // when:
                await expect(landWorks.setMetaverseRegistryReferrers([ethers.constants.AddressZero], [listReferrer.address], [3_000]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when referrer is 0x0', async () => {
                const expectedRevertMessage = '_referrer cannot be 0x0';
                // when:
                await expect(landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [ethers.constants.AddressZero], [3_000]))
                    .to.be.revertedWith(expectedRevertMessage);
            });

            it('should revert when caller is not owner, nor referral admin', async () => {
                const expectedRevertMessage = 'caller is neither admin, nor owner';
                // when:
                await expect(landWorks.connect(consumer).setMetaverseRegistryReferrers([mockERC721Registry.address], [listReferrer.address], [3_000]))
                    .to.be.revertedWith(expectedRevertMessage);
            });
        });

        describe('', async () => {
            const expectedClaimReferralFee = (expectedProtocolFee * listMainPercentage) / 10_000;

            beforeEach(async () => {
                await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                // and:
                await mockERC721Registry.approve(landWorks.address, tokenID);

                await landWorks.setReferrers([listReferrer.address], [listMainPercentage], [0]);

                await landWorks
                    .list(
                        metaverseID,
                        mockERC721Registry.address,
                        tokenID,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        listReferrer.address
                    );

                const [paymentToken, rentFee] = await landWorks.calculateRentFee(0, minPeriod, ethers.constants.AddressZero);

                await landWorks.rent(assetId, minPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, ethers.constants.AddressZero, { value: rentFee });
            });

            describe('claimReferrerFee', async () => {
                it('should successfully claim referral fee', async () => {
                    // given:
                    const beforeBalance = await listReferrer.getBalance();

                    // when:
                    const [callStaticPaymentToken, callStaticRentFee] = await landWorks
                        .connect(listReferrer)
                        .callStatic
                        .claimReferrerFee(ADDRESS_ONE);
                    const tx = await landWorks.connect(listReferrer).claimReferrerFee(ADDRESS_ONE);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await listReferrer.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(expectedClaimReferralFee));
                    // and:
                    expect(callStaticPaymentToken).to.equal(ADDRESS_ONE);
                    expect(callStaticRentFee).to.equal(expectedClaimReferralFee);
                });

                it('should emit event with args', async () => {
                    // when:
                    await expect(
                        landWorks
                            .connect(listReferrer)
                            .claimReferrerFee(ADDRESS_ONE)
                    )
                        .to.emit(landWorks, 'ClaimReferrerFee')
                        .withArgs(
                            listReferrer.address,
                            ADDRESS_ONE,
                            expectedClaimReferralFee);
                });

                it('should not emit event with args when amount is 0', async () => {
                    // when:
                    await expect(
                        landWorks
                            .claimReferrerFee(ADDRESS_ONE)
                    )
                        .to.not.emit(landWorks, 'ClaimReferrerFee')
                        .withArgs(
                            listReferrer.address,
                            ADDRESS_ONE,
                            expectedClaimReferralFee);
                });
            });

            describe('claimMultipleReferrerFees', async () => {
                const expectedClaimReferralFee = (expectedProtocolFee * listMainPercentage) / 10_000;

                it('should successfully claim referrer fees', async () => {
                    // given:
                    const beforeBalance = await listReferrer.getBalance();

                    // when:
                    const [callStaticPaymentToken, callStaticRentFee] = await landWorks
                        .connect(listReferrer)
                        .callStatic
                        .claimReferrerFee(ADDRESS_ONE);
                    const tx = await landWorks.connect(listReferrer).claimMultipleReferrerFees([ADDRESS_ONE]);
                    const receipt = await tx.wait();

                    // then:
                    const txFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);
                    const afterBalance = await listReferrer.getBalance();
                    expect(afterBalance).to.equal(beforeBalance.sub(txFee).add(expectedClaimReferralFee));
                    // and:
                    expect(callStaticPaymentToken).to.equal(ADDRESS_ONE);
                    expect(callStaticRentFee).to.equal(expectedClaimReferralFee);
                });

                it('should emit events with args', async () => {
                    // when:
                    await expect(
                        landWorks
                            .connect(listReferrer)
                            .claimMultipleReferrerFees([ADDRESS_ONE])
                    )
                        .to.emit(landWorks, 'ClaimReferrerFee')
                        .withArgs(
                            listReferrer.address,
                            ADDRESS_ONE,
                            expectedClaimReferralFee);
                });

                it('should not emit event with args when amount is 0', async () => {
                    // when:
                    await expect(
                        landWorks
                            .claimMultipleReferrerFees([ADDRESS_ONE])
                    )
                        .to.not.emit(landWorks, 'ClaimReferrerFee')
                        .withArgs(
                            listReferrer.address,
                            ADDRESS_ONE,
                            expectedClaimReferralFee);
                });
            });
        });

        describe('rents', async () => {
            beforeEach(async () => {
                await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                // and:
                await mockERC721Registry.approve(landWorks.address, tokenID);
                // and:
                await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [0, rentSecondaryPercentage]);
                // and:
                await landWorks
                    .list(
                        metaverseID,
                        mockERC721Registry.address,
                        tokenID,
                        minPeriod,
                        maxPeriod,
                        maxFutureTime,
                        ADDRESS_ONE,
                        pricePerSecond,
                        listReferrer.address
                    );
            });

            describe('calculateRentFee', async () => {
                it('should successfully return actual amount', async () => {
                    const [paymentToken, amount] = await landWorks.calculateRentFee(assetId, maxPeriod, ethers.constants.AddressZero);

                    expect(amount).to.equal(pricePerSecond * maxPeriod);
                    expect(paymentToken).to.equal(ADDRESS_ONE);
                });

                it('should successfully return the changed amount based on referral percentages', async () => {
                    // given:
                    const totalRentReferralFee = Math.floor((expectedProtocolFee * rentMainPercentage) / 10_000);
                    const discount = Math.floor((totalRentReferralFee * rentSecondaryPercentage) / 10_000);
                    const expectedRentFee = value - discount;

                    // when:
                    const [paymentToken, amount] = await landWorks.calculateRentFee(assetId, minPeriod, rentReferrer.address);

                    // then:
                    expect(amount).to.equal(expectedRentFee);
                    expect(paymentToken).to.equal(ADDRESS_ONE);
                });

                it('should revert when asset is not found', async () => {
                    const expectedRevertMessage = '_assetId not found';
                    // when:
                    await expect(landWorks.calculateRentFee(2, maxPeriod, rentReferrer.address))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should revert when rent referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';
                    // when:
                    await expect(landWorks.calculateRentFee(assetId, maxPeriod, nonOwner.address))
                        .to.be.revertedWith(expectedRevertMessage);
                });
            });

            describe('rent', async () => {

                it('should revert when referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';
                    // when:
                    await expect(landWorks.connect(nonOwner)
                        .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, value, consumer.address, { value: value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should successfully rent with all referrers taking portions', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [1_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 1_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * listMainPercentage) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * listSecondaryPercentage) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * rentMainPercentage) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * rentSecondaryPercentage) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedProtocolFees = listAndRentReferrers - listReferralAmount - rentReferralAmount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner)
                        .rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                    // and:
                    expect(rentAmount).to.equal(expectedOwnerReward + expectedTotalProtocolFees);
                });

                it('should rent successfully when metaverse registry referrer takes all even if referrers have percentages', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [10_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 10_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should rent successfully when no protocol fees are left', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 50%, Lister - 50%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 5_000], [5_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * 5_000) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should not accrue fees when to list referrer is set to 0', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 0%, lister - 0%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [0, 5_000], [2_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = listAndRentReferrers - rentReferralAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });

                it('should successfully accrue all the protocol fees to list referrer if he matches rent and no metaverse registry referrer is found', async () => {
                    // Metaverse Registry - 0%
                    // List referrer - 50%, lister - 0%
                    // Rent referrer == list refеrrer - 50%, renter - 0%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [0]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 0], [0, 0]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);

                    const expectedlistReferralAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = protocolFees - expectedlistReferralAmount * 2; // potential leftovers

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, listReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rent(assetId, maxPeriod, MAX_RENT_START, ADDRESS_ONE, rentFee, listReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedlistReferralAmount * 2);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });
            });

            describe('rentDecentraland', async () => {
                const assetId = 1;

                beforeEach(async () => {
                    // given:
                    await landWorks.setRegistry(metaverseID, landRegistry.address, true);
                    await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);

                    // Mint LAND
                    const x = 0, y = 0;
                    await landRegistry.authorizeDeploy(owner.address);
                    await landRegistry.assignNewParcel(x, y, owner.address);
                    const landId = await landRegistry.encodeTokenId(x, y);
                    // and:
                    await landRegistry.approve(landWorks.address, landId);
                    await landWorks
                        .list(
                            metaverseID,
                            landRegistry.address,
                            landId,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            listReferrer.address
                        );
                });

                it('should revert when referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';
                    // when:
                    await expect(landWorks.connect(nonOwner)
                        .rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, consumer.address, { value: value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should successfully rent with all referrers taking portions', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([landRegistry.address], [consumer.address], [1_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 1_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * listMainPercentage) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * listSecondaryPercentage) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * rentMainPercentage) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * rentSecondaryPercentage) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedProtocolFees = listAndRentReferrers - listReferralAmount - rentReferralAmount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner)
                        .rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                    // and:
                    expect(rentAmount).to.equal(expectedOwnerReward + expectedTotalProtocolFees);
                });

                it('should rent successfully when metaverse registry referrer takes all even if referrers have percentages', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([landRegistry.address], [consumer.address], [10_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 10_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should rent successfully when no protocol fees are left', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 50%, Lister - 50%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([landRegistry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 5_000], [5_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * 5_000) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should not accrue fees when to list referrer is set to 0', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 0%, lister - 0%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([landRegistry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [0, 5_000], [2_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = listAndRentReferrers - rentReferralAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });

                it('should successfully accrue all the protocol fees to list referrer if he matches rent and no metaverse registry referrer is found', async () => {
                    // Metaverse Registry - 0%
                    // List referrer - 50%, lister - 0%
                    // Rent referrer == list refеrrer - 50%, renter - 0%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([landRegistry.address], [consumer.address], [0]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 0], [0, 0]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);

                    const expectedlistReferralAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = protocolFees - expectedlistReferralAmount * 2; // potential leftovers

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, listReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentDecentraland(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, listReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'UpdateOperator')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount)
                        .to.emit(landWorks, 'UpdateState')
                        .withArgs(assetId, rentId, nonOwner.address);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedlistReferralAmount * 2);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });
            });

            describe('rentWithConsumer', async () => {
                const assetId = 1;
                let metaverseConsumableAdapterFacet: Contract;

                let mockERC721Registry: Contract;
                let metaverseAdapter: Contract;

                beforeEach(async () => {
                    metaverseConsumableAdapterFacet = await Deployer.deployContract('MetaverseConsumableAdapterFacet');

                    const diamondAddFacet = [
                        {
                            facetAddress: metaverseConsumableAdapterFacet.address,
                            action: FacetCutAction.Add,
                            functionSelectors: Diamond.getSelectorsFor(metaverseConsumableAdapterFacet)
                        }
                    ];

                    await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");

                    mockERC721Registry = await Deployer.deployContract('ERC721Mock');
                    await mockERC721Registry.mint(owner.address, tokenID);
                    metaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, mockERC721Registry.address]);

                    await landWorks.setMetaverseName(metaverseID, metaverseName);
                    await landWorks.setRegistry(metaverseID, mockERC721Registry.address, true);

                    await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
                    await landWorks.setConsumableAdapter(mockERC721Registry.address, metaverseAdapter.address);

                    // and:
                    await mockERC721Registry.approve(landWorks.address, tokenID);

                    await landWorks
                        .list(
                            metaverseID,
                            mockERC721Registry.address,
                            tokenID,
                            minPeriod,
                            maxPeriod,
                            maxFutureTime,
                            ADDRESS_ONE,
                            pricePerSecond,
                            listReferrer.address
                        );
                });

                it('should revert when referrer is not whitelisted', async () => {
                    const expectedRevertMessage = '_referrer not whitelisted';
                    // when:
                    await expect(landWorks.connect(nonOwner)
                        .rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, value, consumer.address, { value: value }))
                        .to.be.revertedWith(expectedRevertMessage);
                });

                it('should successfully rent with all referrers taking portions', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [1_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 1_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * listMainPercentage) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * listSecondaryPercentage) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * rentMainPercentage) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * rentSecondaryPercentage) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedProtocolFees = listAndRentReferrers - listReferralAmount - rentReferralAmount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner)
                        .rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                    // and:
                    expect(rentAmount).to.equal(expectedOwnerReward + expectedTotalProtocolFees);
                });

                it('should rent successfully when metaverse registry referrer takes all even if referrers have percentages', async () => {
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [10_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [listMainPercentage, rentMainPercentage], [listSecondaryPercentage, rentSecondaryPercentage]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 10_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should rent successfully when no protocol fees are left', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 50%, Lister - 50%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 5_000], [5_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const listReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedListerAmount = Math.floor((listReferralAmount * 5_000) / 10_000);
                    const expectedListReferrerAmount = listReferralAmount - expectedListerAmount;
                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedTotalProtocolFees = protocolFees - expectedListerAmount;
                    const expectedOwnerReward = rentAmount - protocolFees + expectedListerAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, 0)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedListReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedListReferrerAmount);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(0);
                });

                it('should not accrue fees when to list referrer is set to 0', async () => {
                    // Metaverse Registry - 50%
                    // List Referrer - 0%, lister - 0%
                    // Rent referrer - 50%, renter - 50%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [5_000]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [0, 5_000], [2_000, 5_000]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);
                    const expectedMetaverseRegistryReferrerAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const listAndRentReferrers = protocolFees - expectedMetaverseRegistryReferrerAmount;

                    const rentReferralAmount = Math.floor((listAndRentReferrers * 5_000) / 10_000);
                    const expectedRenterDiscount = Math.floor((rentReferralAmount * 5_000) / 10_000);
                    const expectedRentReferrerAmount = rentReferralAmount - expectedRenterDiscount;
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = listAndRentReferrers - rentReferralAmount;

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, rentReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, rentReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, consumer.address, expectedMetaverseRegistryReferrerAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, rentReferrer.address, expectedRentReferrerAmount)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(expectedMetaverseRegistryReferrerAmount);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(rentReferrer.address, ADDRESS_ONE)).to.equal(expectedRentReferrerAmount);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });

                it('should successfully accrue all the protocol fees to list referrer if he matches rent and no metaverse registry referrer is found', async () => {
                    // Metaverse Registry - 0%
                    // List referrer - 50%, lister - 0%
                    // Rent referrer == list refеrrer - 50%, renter - 0%
                    // given:
                    await landWorks.setMetaverseRegistryReferrers([mockERC721Registry.address], [consumer.address], [0]);
                    // and:
                    await landWorks.setReferrers([listReferrer.address, rentReferrer.address], [5_000, 0], [0, 0]);
                    const rentAmount = maxPeriod * pricePerSecond;
                    const protocolFees = Math.floor((rentAmount * FEE_PERCENTAGE) / FEE_PRECISION);

                    const expectedlistReferralAmount = Math.floor((protocolFees * 5_000) / 10_000);
                    const expectedOwnerReward = rentAmount - protocolFees;
                    const expectedProtocolFees = protocolFees - expectedlistReferralAmount * 2; // potential leftovers

                    // when:
                    const [paymentToken, rentFee] = await landWorks.calculateRentFee(assetId, maxPeriod, listReferrer.address);
                    const tx = await landWorks.connect(nonOwner).rentWithConsumer(assetId, maxPeriod, MAX_RENT_START, nonOwner.address, ADDRESS_ONE, rentFee, listReferrer.address, { value: rentFee });
                    const receipt = await tx.wait();

                    const start = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                    const end = start + maxPeriod;

                    // then:
                    await expect(tx)
                        .to.emit(landWorks, 'Rent')
                        .withArgs(assetId, rentId, nonOwner.address, start, end, ADDRESS_ONE, expectedOwnerReward, expectedProtocolFees)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount)
                        .to.emit(landWorks, 'AccrueReferralFee')
                        .withArgs(assetId, rentId, listReferrer.address, expectedlistReferralAmount)
                        .to.emit(landWorks, 'UpdateRentConsumer')
                        .withArgs(assetId, rentId, nonOwner.address)
                        .to.emit(landWorks, 'UpdateAdapterConsumer')
                        .withArgs(assetId, rentId, metaverseAdapter.address, nonOwner.address)
                        .to.emit(metaverseAdapter, 'ConsumerChanged')
                        .withArgs(landWorks.address, nonOwner.address, tokenID);
                    // and:
                    expect(await landWorks.referrerFee(consumer.address, ADDRESS_ONE)).to.equal(0);
                    expect(await landWorks.referrerFee(listReferrer.address, ADDRESS_ONE)).to.equal(expectedlistReferralAmount * 2);
                    expect(await landWorks.referrerFee(nonOwner.address, ADDRESS_ONE)).to.equal(0);
                    const assetRentFees = await landWorks.assetRentFeesFor(assetId, ADDRESS_ONE);
                    expect(assetRentFees).to.equal(expectedOwnerReward);
                    // and:
                    expect(await landWorks.protocolFeeFor(ADDRESS_ONE)).to.equal(expectedProtocolFees);
                });

            });
        });
    });

    describe('Diamond Cut ERC-721 Old Receiver facet', async () => {
        let erc721OldHolder: Contract;

        let mockERC721Registry: Contract;
        let metaverseAdapter: Contract;
        const tokenID = 1;
        const metaverseID = 1;
        const metaverseName = 'NoConsumer';
        const minPeriod = 1;
        const maxPeriod = 100;
        const maxFutureTime = 120;
        const pricePerSecond = 1337;

        before(async () => {
            erc721OldHolder = await Deployer.deployContract('ERC721OldHolder');

            const diamondAddFacet = [
                {
                    facetAddress: erc721OldHolder.address,
                    action: FacetCutAction.Add,
                    functionSelectors: Diamond.getSelectorsFor(erc721OldHolder)
                }
            ];

            await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");

            mockERC721Registry = await Deployer.deployContract('ERC721OldMock');
            await mockERC721Registry.mint(owner.address, tokenID);
            metaverseAdapter = await Deployer.deployContract('ConsumableAdapterV1', undefined, [landWorks.address, mockERC721Registry.address]);

            await landWorks.setMetaverseName(metaverseID, metaverseName);
            await landWorks.setRegistry(metaverseID, mockERC721Registry.address, true);

            await landWorks.setFee(ADDRESS_ONE, FEE_PERCENTAGE);
        });

        it('should list ERC-721, which implements old onERC721Received', async () => {
            // given:
            await mockERC721Registry.approve(landWorks.address, tokenID);

            // when:
            await landWorks.list(metaverseID, mockERC721Registry.address, tokenID, minPeriod, maxPeriod, maxFutureTime, ADDRESS_ONE, pricePerSecond, ethers.constants.AddressZero);

            // then:
            expect(await mockERC721Registry.ownerOf(tokenID)).to.equal(landWorks.address);
            expect(await landWorks.ownerOf(assetId)).to.equal(owner.address);
            // and:
            const asset = await landWorks.assetAt(assetId);
            expect(asset.metaverseId).to.equal(metaverseID);
            expect(asset.metaverseRegistry).to.equal(mockERC721Registry.address);
            expect(asset.metaverseAssetId).to.equal(tokenID);
            expect(asset.paymentToken).to.equal(ADDRESS_ONE);
            expect(asset.minPeriod).to.equal(minPeriod);
            expect(asset.maxPeriod).to.equal(maxPeriod);
            expect(asset.maxFutureTime).to.equal(maxFutureTime);
            expect(asset.pricePerSecond).equal(pricePerSecond);
            expect(asset.status).to.equal(0); // Listed
            expect(asset.totalRents).to.equal(0);
            expect(await landWorks.totalSupply()).to.equal(1);
            expect(await landWorks.tokenOfOwnerByIndex(owner.address, assetId)).to.equal(assetId);
            expect(await landWorks.tokenByIndex(assetId)).to.equal(assetId);
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
            await landWorks.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            // Remove the function selectors
            const selectorsToRemove = [ownerSel, sel5, sel10];
            const removeSelectorsFacet = [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: selectorsToRemove
            }];
            await landWorks.connect(owner).diamondCut(removeSelectorsFacet, ethers.constants.AddressZero, '0x');

            // Get the test1Facet's registered functions
            let actualSelectors = await landWorks.facetFunctionSelectors(test1Facet.address);
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
});