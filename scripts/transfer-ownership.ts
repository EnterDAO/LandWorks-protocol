import hardhat from 'hardhat';
import { ethers } from 'hardhat';

async function transferOwnership(diamondAddress: string, newOwner: string) {
  await hardhat.run('compile');

  const diamond = await ethers.getContractAt("ILandWorks", diamondAddress);

  const diamondTransferOwnersihp = await diamond.transferOwnership(newOwner);
  console.log(`Transfer Ownership [${diamondTransferOwnersihp.hash}] submitted, waiting to be mined...`);
  await diamondTransferOwnersihp.wait();
}

module.exports = transferOwnership;