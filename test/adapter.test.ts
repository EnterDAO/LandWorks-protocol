import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Diamond } from '../utils/diamond';
import { Deployer } from "../utils/deployer";
import { ConsumableAdapterV1, ERC721Mock } from '../typechain-types';

describe('Consumable Adapter V1', function () {
	let snapshotId: any;

	let owner: SignerWithAddress; let landworks: SignerWithAddress;
	let consumer: string;
	let adapter: ConsumableAdapterV1;
	let erc721Mock: ERC721Mock;

	before(async () => {
		const signers = await ethers.getSigners();
		owner = signers[0];
		landworks = signers[1];
		consumer = signers[2].address;

		erc721Mock = await Deployer.deployContract('ERC721Mock') as ERC721Mock;
		adapter = await Deployer.deployContract("ConsumableAdapterV1", undefined, [landworks.address, erc721Mock.address]) as ConsumableAdapterV1;
	});

	beforeEach(async function () {
		snapshotId = await ethers.provider.send('evm_snapshot', []);
	});

	afterEach(async function () {
		await ethers.provider.send('evm_revert', [snapshotId]);
	});

	it('should support IERC721Consumable interface', async () => {
		const IERC721Consumable = await ethers.getContractAt('IERC721Consumable', ethers.constants.AddressZero);
		expect(await adapter.supportsInterface(Diamond.getInterfaceId(IERC721Consumable))).to.be.true;
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
		await adapter.connect(landworks).changeConsumer(consumer, ERC721_ID);
		// then
		expect(await adapter.consumerOf(ERC721_ID)).to.equal(consumer);
	});

	it('should emit event correctly', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);

		await expect(adapter.connect(landworks).changeConsumer(consumer, ERC721_ID))
			.to.emit(adapter, 'ConsumerChanged')
			.withArgs(landworks.address, consumer, ERC721_ID);
	});

	it('should accept only landworks as sender', async () => {
		const ERC721_ID = 1;
		await erc721Mock.mint(landworks.address, ERC721_ID);
		await expect(adapter.changeConsumer(consumer, ERC721_ID)).to.be
			.revertedWith("ConsumableAdapter: sender is not LandWorks")
	});

	it('should fail when token is not existing', async () => {
		const NON_EXISTING_ID = 1;
		await expect(adapter.connect(landworks).changeConsumer(owner.address, NON_EXISTING_ID)).to.be
			.revertedWith("ERC721: owner query for nonexistent token");
	});

	it('should fail when sender is not owner', async () => {
		// given
		const ERC721_ID = 1;
		await erc721Mock.mint(consumer, ERC721_ID);

		await expect(adapter.connect(landworks).changeConsumer(owner.address, ERC721_ID)).to.be
			.revertedWith("ConsumableAdapter: sender is not owner of tokenId");
	});
});
