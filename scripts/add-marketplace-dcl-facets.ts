import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function addMarketplaceDclFacets(diamondAddress: string) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

  console.log('Deploying MarketplaceFacet...');
  const marketplaceFacet = await Deployer.deployContract('MarketplaceFacet');
  console.log(`MarketplaceFacet deployed to: ${marketplaceFacet.address}`);

  console.log('Deploying DecentralandFacet...');
  const decentralandFacet = await Deployer.deployContract('DecentralandFacet');
  console.log(`DecentralandFacet deployed to: ${decentralandFacet.address}`);

  const diamondAddFacets = [
    {
      facetAddress: marketplaceFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: Diamond.getSelectorsFor(marketplaceFacet)
    },
    {
      facetAddress: decentralandFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: Diamond.getSelectorsFor(decentralandFacet)
    }
  ];

  const diamondAddFacetsTx = await landWorks.diamondCut(diamondAddFacets, ethers.constants.AddressZero, "0x");
  console.log(`Diamond Cut Add MarketplaceFacet & DecentralandFacet [${diamondAddFacetsTx.hash}] submitted, waiting to be mined...`);
  await diamondAddFacetsTx.wait(5);

  console.log('Verifying MarketplaceFacet on Etherscan...');
  await hardhat.run('verify:verify', {
    address: marketplaceFacet.address,
    constructorArguments: []
  });

  console.log('Verifying DecentralandFacet on Etherscan...');
  await hardhat.run('verify:verify', {
    address: decentralandFacet.address,
    constructorArguments: []
  });
}

module.exports = addMarketplaceDclFacets;