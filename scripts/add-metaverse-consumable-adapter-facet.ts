import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function addMetaverseConsumableAdapterFacet(diamondAddress: string) {
	await hardhat.run('compile');

	const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

	console.log('Deploying MetaverseConsumableAdapterFacet...');
	const consumableAdapterFacet = await Deployer.deployContract('MetaverseConsumableAdapterFacet');
	console.log(`MetaverseConsumableAdapterFacet deployed to: ${consumableAdapterFacet.address}`);

	const diamondAddFacets = [
		{
			facetAddress: consumableAdapterFacet.address,
			action: FacetCutAction.Add,
			functionSelectors: Diamond.getSelectorsFor(consumableAdapterFacet)
		}
	];

	const diamondAddFacetsTx = await landWorks.diamondCut(diamondAddFacets, ethers.constants.AddressZero, "0x");
	console.log(`Diamond Cut Add MetaverseConsumableAdapterFacet [${diamondAddFacetsTx.hash}] submitted, waiting to be mined...`);
	await diamondAddFacetsTx.wait(5);

	console.log('Verifying MetaverseConsumableAdapterFacet on Etherscan...');
	await hardhat.run('verify:verify', {
		address: consumableAdapterFacet.address,
		constructorArguments: []
	});
}

module.exports = addMetaverseConsumableAdapterFacet;