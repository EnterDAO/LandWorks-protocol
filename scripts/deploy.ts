import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from "../utils/deployer";
import { Diamond } from "../utils/diamond";
import { Erc721Facet } from "../typechain";

const ERC721_NAME = "LandWorks";
const ERC721_SYMBOL = "LW";
const ERC721_BASE_URI = "https://api.landworks.xyz/nfts/"

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

    console.log('Deploying FeeFacet...');
    const feeFacet = await Deployer.deployContract('FeeFacet');
    console.log(`FeeFacet deployed to: ${feeFacet.address}`);

    console.log('Deploying ERC-721Facet...');
    const erc721Facet = await Deployer.deployContract('ERC721Facet');
    console.log(`ERC-721Facet deployed to: ${erc721Facet.address}`);

    console.log('Deploying MarketplaceFacet...');
    const marketplaceFacet = await Deployer.deployContract('MarketplaceFacet');
    console.log(`MarketplaceFacet deployed to: ${marketplaceFacet.address}`);

    console.log('Deploying DecentralandFacet...');
    const decentralandFacet = await Deployer.deployContract('DecentralandFacet');
    console.log(`DecentralandFacet deployed to: ${decentralandFacet.address}`);

    console.log('Deploying LandWorks (Diamond)...');
    const diamond = await Deployer.deployDiamond(
        'LandWorks',
        [cutFacet, loupeFacet, ownershipFacet, feeFacet, erc721Facet, marketplaceFacet, decentralandFacet],
        deployerAddress,
    );
    console.log(`LandWorks (Diamond) deployed at: ${diamond.address}`);

    console.log(`Initialising LandWorks NFT...`);
    const erc721FacetInstance = (await Diamond.asFacet(diamond, 'ERC721Facet')) as Erc721Facet;
    await erc721FacetInstance.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI);

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

    console.log('Verifying FeeFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: feeFacet.address,
        constructorArguments: []
    });

    console.log('Verifying ERC-721Facet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: erc721Facet.address,
        constructorArguments: []
    });

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

    console.log('Verifying LandWorks (Diamond) on Etherscan...');
    await hardhat.run('verify:verify', {
        address: diamond.address,
        constructorArguments: [
            Diamond.getAsAddCuts([cutFacet, loupeFacet, ownershipFacet, feeFacet, erc721Facet, marketplaceFacet, decentralandFacet]),
            deployerAddress
        ]
    });

    console.log(`Finished Deployment!`);
    console.log('DiamondCutFacet address: ', cutFacet.address);
    console.log('DiamondLoupeFacet address: ', loupeFacet.address);
    console.log('OwnershipFacet address: ', ownershipFacet.address);
    console.log('FeeFacet address: ', feeFacet.address);
    console.log('ERC-721Facet address: ', erc721Facet.address);
    console.log('MarketplaceFacet address: ', marketplaceFacet.address);
    console.log('DecentralandFacet address: ', decentralandFacet.address);
    console.log('LandWorks (Diamond) address: ', diamond.address);
}

module.exports = deploy;