import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Contract, Signer} from 'ethers';
import {Diamond} from '../utils/diamond';
import {DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, Test1Facet, Test2Facet} from '../typechain';
import {Deployer} from "../utils/deployer";
import FacetCutAction = Diamond.FacetCutAction;

describe('LandWorks', function () {
    let loupeFacet: Contract, cutFacet: Contract, ownershipFacet: Contract;
    let diamond: Contract, loupe: DiamondLoupeFacet, cut: DiamondCutFacet, ownership: OwnershipFacet;
    let owner: Signer, nonOwner: Signer;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        nonOwner = signers[1];

        cutFacet = await Deployer.deployContract('DiamondCutFacet');
        loupeFacet = await Deployer.deployContract('DiamondLoupeFacet');
        ownershipFacet = await Deployer.deployContract('OwnershipFacet');
        diamond = await Deployer.deployDiamond(
            'LandWorks',
            [cutFacet, loupeFacet, ownershipFacet],
            await owner.getAddress(),
        );

        loupe = (await Diamond.asFacet(diamond, 'DiamondLoupeFacet')) as DiamondLoupeFacet;
        cut = (await Diamond.asFacet(diamond, 'DiamondCutFacet')) as DiamondCutFacet;
        ownership = (await Diamond.asFacet(diamond, 'OwnershipFacet')) as OwnershipFacet;
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
            const actualFacets = await loupe.facetAddresses();
            expect(actualFacets.length).to.be.equal(3);
            expect(actualFacets).to.eql([cutFacet.address, loupeFacet.address, ownershipFacet.address]);
        });

        it('has correct function selectors linked to facet', async function () {
            const actualCutSelectors: Array<string> = Diamond.getSelectorsFor(cutFacet);
            expect(await loupe.facetFunctionSelectors(cutFacet.address)).to.deep.equal(actualCutSelectors);

            const actualLoupeSelectors = Diamond.getSelectorsFor(loupeFacet);
            expect(await loupe.facetFunctionSelectors(loupeFacet.address)).to.deep.equal(actualLoupeSelectors);

            const actualOwnerSelectors = Diamond.getSelectorsFor(ownershipFacet);
            expect(await loupe.facetFunctionSelectors(ownershipFacet.address)).to.deep.equal(actualOwnerSelectors);
        });

        it('associates selectors correctly to facets', async function () {
            for (const sel of Diamond.getSelectorsFor(loupeFacet)) {
                expect(await loupe.facetAddress(sel)).to.be.equal(loupeFacet.address);
            }

            for (const sel of Diamond.getSelectorsFor(cutFacet)) {
                expect(await loupe.facetAddress(sel)).to.be.equal(cutFacet.address);
            }

            for (const sel of Diamond.getSelectorsFor(ownershipFacet)) {
                expect(await loupe.facetAddress(sel)).to.be.equal(ownershipFacet.address);
            }
        });

        it('returns correct response when facets() is called', async function () {
            const facets = await loupe.facets();

            expect(facets[0].facetAddress).to.equal(cutFacet.address);
            expect(facets[0].functionSelectors).to.eql(Diamond.getSelectorsFor(cutFacet));

            expect(facets[1].facetAddress).to.equal(loupeFacet.address);
            expect(facets[1].functionSelectors).to.eql(Diamond.getSelectorsFor(loupeFacet));

            expect(facets[2].facetAddress).to.equal(ownershipFacet.address);
            expect(facets[2].functionSelectors).to.eql(Diamond.getSelectorsFor(ownershipFacet));
        });
    });

    describe('DiamondCut Facet', async () => {
        let test1Facet: Contract, test2Facet: Contract;
        let snapshotId: any;

        beforeEach(async function () {
            snapshotId = await ethers.provider.send('evm_snapshot', []);

            test1Facet = await Deployer.deployContract('Test1Facet');
            test2Facet = await Deployer.deployContract('Test2Facet');
        });

        afterEach(async function () {
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('should fail if not called by contract owner', async function () {
            const _diamondCut = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];

            await expect(
                cut.connect(nonOwner).diamondCut(_diamondCut, ethers.constants.AddressZero, "0x")
            ).to.be.revertedWith('Must be contract owner');
        });

        it('should allow adding new functions', async function () {
            const addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await expect(cut.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const facets = await loupe.facets();
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
            await cut.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const replaceTest1WithTest2Facet = [{
                facetAddress: test2Facet.address,
                action: FacetCutAction.Replace,
                functionSelectors: Diamond.getSelectorsFor(test2Facet),
            }];

            await expect(cut.connect(owner).diamondCut(replaceTest1WithTest2Facet, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test2 = (await Diamond.asFacet(diamond, 'Test2Facet')) as Test2Facet;
            expect(await test2.test1Func1()).to.be.equal(2);
        });

        it('should allow removing functions', async function () {
            let addTest1Facet = [{
                facetAddress: test1Facet.address,
                action: FacetCutAction.Add,
                functionSelectors: Diamond.getSelectorsFor(test1Facet),
            }];
            await cut.connect(owner).diamondCut(addTest1Facet, ethers.constants.AddressZero, '0x');

            const removeTest1Func = [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: [test1Facet.interface.getSighash('test1Func1()')],
            }];

            await expect(cut.connect(owner).diamondCut(removeTest1Func, ethers.constants.AddressZero, '0x')).to.not.be.reverted;

            const test1 = (await Diamond.asFacet(diamond, 'Test1Facet')) as Test1Facet;
            await expect(test1.test1Func1()).to.be.revertedWith('Diamond: Function does not exist');
        });
    });

    describe('Ownership Facet', async () => {

        it('should return owner', async function () {
            expect(await ownership.owner()).to.equal(await owner.getAddress());
        });

        it('should revert if transferOwnership not called by owner', async function () {
            await expect(ownership.connect(nonOwner).transferOwnership(await nonOwner.getAddress()))
                .to.be.revertedWith('Must be contract owner');
        });

        it('should revert if transferOwnership called with same address', async function () {
            await expect(ownership.connect(owner).transferOwnership(await owner.getAddress()))
                .to.be.revertedWith('Previous owner and new owner must be different');
        });

        it('should allow transferOwnership if called by owner', async function () {
            await expect(ownership.connect(owner).transferOwnership(await nonOwner.getAddress()))
                .to.not.be.reverted;

            expect(await ownership.owner()).to.equal(await nonOwner.getAddress());
        });
    });
});