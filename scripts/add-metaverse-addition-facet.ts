import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function addMetaverseAdditionFacet(diamondAddress: string) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

  console.log('Deploying MetaverseAdditionFacet...');
  const metaverseAdditionFacet = await Deployer.deployContract('MetaverseAdditionFacet');
  console.log(`MetaverseAdditionFacet deployed to: ${metaverseAdditionFacet.address}`);

  const diamondAddFacet = [
    {
      facetAddress: metaverseAdditionFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: Diamond.getSelectorsFor(metaverseAdditionFacet)
    },
  ];

  const diamondAddFacetTx = await landWorks.diamondCut(diamondAddFacet, ethers.constants.AddressZero, "0x");
  console.log(`Diamond Cut Add MetaverseAdditionFacet [${diamondAddFacetTx.hash}] submitted, waiting to be mined...`);
  await diamondAddFacetTx.wait(5);

  console.log('Verifying MetaverseAdditionFacet on Etherscan...');
  await hardhat.run('verify:verify', {
    address: metaverseAdditionFacet.address,
    constructorArguments: []
  });
}

module.exports = addMetaverseAdditionFacet;