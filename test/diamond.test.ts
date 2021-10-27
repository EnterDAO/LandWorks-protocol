import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { Diamond } from '../utils/diamond';
import { DiamondCutFacet, DiamondLoupeFacet, Erc721Facet, FeeFacet, LandRegistry, MarketplaceFacet, OwnershipFacet, Test1Facet, Test2Facet } from '../typechain';
import { Deployer } from "../utils/deployer";
import FacetCutAction = Diamond.FacetCutAction;

describe('LandWorks', function () {
    let loupe: Contract, cut: Contract, ownership: Contract, diamond: Contract;
    let loupeFacet: DiamondLoupeFacet, cutFacet: DiamondCutFacet, ownershipFacet: OwnershipFacet;
    let owner: Signer, nonOwner: Signer;
    let snapshotId: any;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        nonOwner = signers[1];

        cut = await Deployer.deployContract('DiamondCutFacet');
        loupe = await Deployer.deployContract('DiamondLoupeFacet');
        ownership = await Deployer.deployContract('OwnershipFacet');
        diamond = await Deployer.deployDiamond(
            'LandWorks',
            [cut, loupe, ownership],
            await owner.getAddress(),
        );

        loupeFacet = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
        cutFacet = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
        ownershipFacet = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
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

        it('should have 3 facets', async () => {
            const actualFacets = await loupeFacet.facetAddresses();
            expect(actualFacets.length).to.be.equal(3);
            expect(actualFacets).to.eql([cut.address, loupe.address, ownership.address]);
        });

        it('has correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cut);
            expect(await loupeFacet.facetFunctionSelectors(cut.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupe);
            expect(await loupeFacet.facetFunctionSelectors(loupe.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownership);
            expect(await loupeFacet.facetFunctionSelectors(ownership.address)).to.deep.equal(actualOwnerSelectors);
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
        });

        it('returns correct response when facets() is called', async function () {
            const facets = await loupeFacet.facets();

            expect(facets[0].facetAddress).to.equal(cut.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cut));

            expect(facets[1].facetAddress).to.equal(loupe.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupe));

            expect(facets[2].facetAddress).to.equal(ownership.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownership));
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
            expect(facets[3].facetAddress).to.eql(test1Facet.address);
            expect(facets[3].functionSelectors).to.eql(Diamond.getSelectorsFor(test1Facet));

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
            expect(await ownershipFacet.owner()).to.equal(await owner.getAddress());
        });

        it('should revert if transferOwnership not called by owner', async function () {
            await expect(ownershipFacet.connect(nonOwner).transferOwnership(await nonOwner.getAddress()))
                .to.be.revertedWith('Must be contract owner');
        });

        it('should revert if transferOwnership called with same address', async function () {
            await expect(ownershipFacet.connect(owner).transferOwnership(await owner.getAddress()))
                .to.be.revertedWith('Previous owner and new owner must be different');
        });

        it('should allow transferOwnership if called by owner', async function () {
            await expect(ownershipFacet.connect(owner).transferOwnership(await nonOwner.getAddress()))
                .to.not.be.reverted;

            expect(await ownershipFacet.owner()).to.equal(await nonOwner.getAddress());
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

    describe('ERC721 Test', async () => {
        const ERC721Symbol = 'LW';
        const ERC721Name = 'LandWorks';

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
                await owner.getAddress(),
            );

            loupeFacet = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
            cutFacet = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
            ownershipFacet = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
            erc721Facet = (await Diamond.asFacet(diamond, 'ERC721Facet')) as Erc721Facet;
            marketplaceFacet = (await Diamond.asFacet(diamond, 'MarketplaceFacet')) as MarketplaceFacet;
            feeFacet = (await Diamond.asFacet(diamond, 'FeeFacet')) as FeeFacet;

            // Init ERC721
            await erc721Facet.initERC721(ERC721Name, ERC721Symbol);

            // Deploy Decentraland LAND
            decentralandProxy = await Deployer.deployContract('LANDProxyMock');
            decentralandLandRegistry = await Deployer.deployContract('LANDRegistryMock');

            await decentralandProxy.upgrade(decentralandLandRegistry.address, await owner.getAddress());

            landRegistry = (await ethers.getContractAt('LANDRegistryMock', decentralandProxy.address)) as LandRegistry;
        });

        it('should properly initialised erc721', async () => {
            expect(await erc721Facet.name()).to.equal(ERC721Name);
            expect(await erc721Facet.symbol()).to.equal(ERC721Symbol);
        });

        it('should list decentraland asset and issue eNft', async () => {
            // given:
            const decentralandMetaverseId = 0;
            await marketplaceFacet.setMetaverseName(decentralandMetaverseId, 'Decentraland');
            await marketplaceFacet.setRegistry(decentralandMetaverseId, landRegistry.address, true);
            // and:
            const x = 0, y = 0;
            await landRegistry.authorizeDeploy(await owner.getAddress());
            await landRegistry.assignNewParcel(x, y, await owner.getAddress());
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
            expect(await erc721Facet.ownerOf(0)).to.equal(await owner.getAddress());
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