import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from "../utils/deployer";

async function deployDecentralandAdminOperatorUpdater() {
  await hardhat.run('compile');
  const deployers = await ethers.getSigners();

  /**
   * Deploying DecentralandAdminOperatorUpdater
   */
  console.log('Deploying DecentralandAdminOperatorUpdater...');
  const updater = await Deployer.deployContract('DecentralandAdminOperatorUpdater');
  console.log(`DecentralandAdminOperatorUpdater deployed to: ${updater.address}`);

  /**
   * Verify Contract
   */
  console.log('Verifying DecentralandAdminOperatorUpdater on Etherscan...');
  await hardhat.run('verify:verify', {
    address: updater.address,
    constructorArguments: []
  });

  console.log(`Finished Deployment!`);
  console.log('DecentralandAdminOperatorUpdater address: ', updater.address);
}

module.exports = deployDecentralandAdminOperatorUpdater;