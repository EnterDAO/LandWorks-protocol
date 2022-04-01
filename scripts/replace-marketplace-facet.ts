import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function replaceMarketplaceFacet(diamondAddress: string) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

  console.log('Deploying MarketplaceFacet...');
  const marketplaceFacet = await Deployer.deployContract('MarketplaceFacet');
  console.log(`MarketplaceFacet deployed to: ${marketplaceFacet.address}`);

  const diamondReplaceFacet = [
    {
      facetAddress: marketplaceFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: Diamond.getSelectorsFor(marketplaceFacet)
    },
  ];

  const diamondAddFacetTx = await landWorks.diamondCut(diamondReplaceFacet, ethers.constants.AddressZero, "0x");
  console.log(`Diamond Cut Replace MarketplaceFacet [${diamondAddFacetTx.hash}] submitted, waiting to be mined...`);
  await diamondAddFacetTx.wait(5);

  console.log('Verifying MarketplaceFacet on Etherscan...');
  await hardhat.run('verify:verify', {
    address: marketplaceFacet.address,
    constructorArguments: []
  });
}

module.exports = replaceMarketplaceFacet;