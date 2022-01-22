import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {Deployer} from "../utils/deployer";
import { AdapterV1, Erc721Mock } from '../typechain';

describe('Adapter V1', function () {
	let snapshotId: any;

	let owner: SignerWithAddress; let landworks: SignerWithAddress;
	let operator: string;
	let adapter: AdapterV1;
	let erc721Mock: Erc721Mock;

	before(async () => {
		const signers = await ethers.getSigners();
		owner = signers[0];
		landworks = signers[1];
		operator = signers[2].address;

		erc721Mock = await Deployer.deployContract('ERC721Mock') as Erc721Mock;
		adapter = await Deployer.deployContract("AdapterV1", undefined, [landworks.address, erc721Mock.address]) as AdapterV1;
	});

	beforeEach(async function () {
		snapshotId = await ethers.provider.send('evm_snapshot', []);
	});

	afterEach(async function () {
		await ethers.provider.send('evm_revert', [snapshotId]);
	});

	it('should set properties correctly on deploy', async () => {
		expect(await adapter.landworks()).to.equal(landworks.address);
		expect(await adapter.token()).to.equal(erc721Mock.address);
	});

	it('should update operator correctly', async () => {
		// given
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);
		// when
		await adapter.connect(landworks).setOperator(ERC721_ID, operator);
		// then
		expect(await adapter.operators(ERC721_ID)).to.equal(operator);
	});

	it('should emit event correctly', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);

		await expect(adapter.connect(landworks).setOperator(ERC721_ID, operator))
			.to.emit(adapter, 'OperatorUpdated')
			.withArgs(ERC721_ID, operator);
	});

	it('should accept only landworks as sender', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);
		await expect(adapter.setOperator(ERC721_ID, operator)).to.be
			.revertedWith("Adapter: sender is not LandWorks")
	});

	it('should fail when token is not existing', async () => {
		const NON_EXISTING_ID = 1;
		await expect(adapter.connect(landworks).setOperator(NON_EXISTING_ID, owner.address)).to.be
			.revertedWith("ERC721: owner query for nonexistent token");
	});

	it('should fail when sender is not owner', async () => {
		// given
		const ERC721_ID = 1;
		await erc721Mock.mint(operator, ERC721_ID);

		await expect(adapter.connect(landworks).setOperator(ERC721_ID, owner.address)).to.be
			.revertedWith("Adapter: sender is not owner of tokenId");
	});
});
