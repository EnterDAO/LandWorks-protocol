import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

async function addERC721OldHolder(diamondAddress: string) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

  console.log('Deploying ERC-721 Old Holder...');
  const erc721OldHolderFacet = await Deployer.deployContract('ERC721OldHolder');
  console.log(`ERC-721 Old Holder Facet deployed to: ${erc721OldHolderFacet.address}`);

  const diamondAddFacets = [
    {
      facetAddress: erc721OldHolderFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: Diamond.getSelectorsFor(erc721OldHolderFacet)
    },
  ];

  const diamondAddFacetsTx = await landWorks.diamondCut(diamondAddFacets, ethers.constants.AddressZero, "0x");
  console.log(`Diamond Cut Add ERC-721 Old Holder Facet [${diamondAddFacetsTx.hash}] submitted, waiting to be mined...`);
  await diamondAddFacetsTx.wait(5);

  console.log('Verifying MarketplaceFacet on Etherscan...');
  await hardhat.run('verify:verify', {
    address: erc721OldHolderFacet.address,
    constructorArguments: []
  });
}

module.exports = addERC721OldHolder;