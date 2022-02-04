import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Deployer } from "../utils/deployer";
import { ConsumableAdapterV1, Erc721Mock } from '../typechain';

describe('Consumable Adapter V1', function () {
	let snapshotId: any;

	let owner: SignerWithAddress; let landworks: SignerWithAddress;
	let consumer: string;
	let adapter: ConsumableAdapterV1;
	let erc721Mock: Erc721Mock;

	before(async () => {
		const signers = await ethers.getSigners();
		owner = signers[0];
		landworks = signers[1];
		consumer = signers[2].address;

		erc721Mock = await Deployer.deployContract('ERC721Mock') as Erc721Mock;
		adapter = await Deployer.deployContract("ConsumableAdapterV1", undefined, [landworks.address, erc721Mock.address]) as ConsumableAdapterV1;
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

	it('should update consumer correctly', async () => {
		// given
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);
		// when
		await adapter.connect(landworks).setConsumer(ERC721_ID, consumer);
		// then
		expect(await adapter.consumers(ERC721_ID)).to.equal(consumer);
	});

	it('should emit event correctly', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);

		await expect(adapter.connect(landworks).setConsumer(ERC721_ID, consumer))
			.to.emit(adapter, 'ConsumerUpdated')
			.withArgs(ERC721_ID, consumer);
	});

	it('should accept only landworks as sender', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);
		await expect(adapter.setConsumer(ERC721_ID, consumer)).to.be
			.revertedWith("ConsumableAdapter: sender is not LandWorks")
	});

	it('should fail when token is not existing', async () => {
		const NON_EXISTING_ID = 1;
		await expect(adapter.connect(landworks).setConsumer(NON_EXISTING_ID, owner.address)).to.be
			.revertedWith("ERC721: owner query for nonexistent token");
	});

	it('should fail when sender is not owner', async () => {
		// given
		const ERC721_ID = 1;
		await erc721Mock.mint(consumer, ERC721_ID);

		await expect(adapter.connect(landworks).setConsumer(ERC721_ID, owner.address)).to.be
			.revertedWith("ConsumableAdapter: sender is not owner of tokenId");
	});
});
