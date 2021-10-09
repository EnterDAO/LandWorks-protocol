import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import {Deployer} from "../utils/deployer";
import {Diamond} from "../utils/diamond";

async function deploy() {
    await hardhat.run('compile');
    const deployers = await ethers.getSigners();
    const deployerAddress = await deployers[0].getAddress();

    /**
     * Deploying LandWorks
     */
    console.log('Deploying DiamondCutFacet...');
    const cutFacet = await Deployer.deployContract('DiamondCutFacet');
    console.log(`DiamondCutFacet deployed to: ${cutFacet.address}`);

    console.log('Deploying DiamondLoupeFacet...');
    const loupeFacet = await Deployer.deployContract('DiamondLoupeFacet');
    console.log(`DiamondLoupeFacet deployed to: ${loupeFacet.address}`);

    console.log('Deploying OwnershipFacet...');
    const ownershipFacet = await Deployer.deployContract('OwnershipFacet');
    console.log(`OwnershipFacet deployed to: ${ownershipFacet.address}`);

    console.log('Deploying LandWorks (Diamond)...');
    const diamond = await Deployer.deployDiamond(
        'LandWorks',
        [cutFacet, loupeFacet, ownershipFacet],
        deployerAddress,
    );
    console.log(`LandWorks (Diamond) deployed at: ${diamond.address}`);

    /**
     * Verify Contracts
     */
    console.log('Verifying DiamondCutFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: cutFacet.address,
        constructorArguments: []
    });

    console.log('Verifying DiamondLoupeFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: loupeFacet.address,
        constructorArguments: []
    });

    console.log('Verifying OwnershipFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: ownershipFacet.address,
        constructorArguments: []
    });

    console.log('Verifying LandWorks (Diamond) on Etherscan...');
    await hardhat.run('verify:verify', {
        address: diamond.address,
        constructorArguments: [
            Diamond.getAsAddCuts([cutFacet, loupeFacet, ownershipFacet]),
            deployerAddress
        ]
    });

    console.log(`Finished Deployment!`);
    console.log('DiamondCutFacet address: ', cutFacet.address);
    console.log('DiamondLoupeFacet address: ', loupeFacet.address);
    console.log('OwnershipFacet address: ', ownershipFacet.address);
    console.log('LandWorks (Diamond) address: ', diamond.address);
}

module.exports = deploy;