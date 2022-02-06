import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from "../utils/deployer";
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function removeMarketplaceDclFacets(diamondAddress: string, marketplaceFacetAddress: string, decentralandFacetAddress: string) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

  const marketplaceFacet = await ethers.getContractAt('MarketplaceFacet', marketplaceFacetAddress);
  const decentralandFacet = await ethers.getContractAt('DecentralandFacet', decentralandFacetAddress);

  const diamondRemoveOldFacets = [
    {
      facetAddress: ethers.constants.AddressZero,
      action: FacetCutAction.Remove,
      functionSelectors: Diamond.getSelectorsFor(marketplaceFacet)
    },
    {
      facetAddress: ethers.constants.AddressZero,
      action: FacetCutAction.Remove,
      functionSelectors: Diamond.getSelectorsFor(decentralandFacet)
    }
  ];

  const diamondRemoveFacetsTx = await landWorks.diamondCut(diamondRemoveOldFacets, ethers.constants.AddressZero, "0x");
  console.log(`Diamond Cut Remove MarketplaceFacet & DecentralandFacet [${diamondRemoveFacetsTx.hash}] submitted, waiting to be mined...`);
  await diamondRemoveFacetsTx.wait();
}

module.exports = removeMarketplaceDclFacets;