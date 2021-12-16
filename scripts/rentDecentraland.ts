import hardhat from 'hardhat';
import { ethers } from 'hardhat';


async function rentDecetraland(landworksContract: string, assetId: string, period: string) {
  await hardhat.run('compile');
  const deployers = await ethers.getSigners();
  const deployerAddress = await deployers[0].getAddress();

  const marketplaceFacet = await ethers.getContractAt('MarketplaceFacet', landworksContract);
  const decentralandFacet = await ethers.getContractAt('DecentralandFacet', landworksContract);

  const asset = await marketplaceFacet.assetAt(assetId);
  const pricePerSecond = asset.pricePerSecond;

  const tx = await decentralandFacet.rentDecentraland(assetId, period, deployerAddress, { value: pricePerSecond.mul(period) });
  console.log(`Tx ${tx.hash} submitted, waiting to be mined...`);

  await tx.wait();
  console.log(`Tx successfully mined.`);
}

module.exports = rentDecetraland;