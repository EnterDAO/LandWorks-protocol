import hardhat from 'hardhat';
import { ethers } from 'hardhat';

async function transferOwnership(diamondAddress: string, newOwner: string) {
  await hardhat.run('compile');

  const diamond = await ethers.getContractAt("ILandWorks", diamondAddress);

  const diamondTransferOwnership = await diamond.transferOwnership(newOwner);
  console.log(`Transfer Ownership [${diamondTransferOwnership.hash}] submitted, waiting to be mined...`);
  await diamondTransferOwnership.wait();
}

module.exports = transferOwnership;