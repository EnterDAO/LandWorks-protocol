import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { Deployer } from "../utils/deployer";
import { Diamond } from "../utils/diamond";

const ERC721_NAME = "LandWorks";
const ERC721_SYMBOL = "LW";
const ERC721_BASE_URI = "https://api.landworks.xyz/nfts/"
const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';
const FEE_PERCENTAGE = 3_000; // 3% fee percentage based on 100_000 fee precision

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

    console.log('Deploying MetaverseAdditionFacet...');
    const metaverseAdditionFacet = await Deployer.deployContract('MetaverseAdditionFacet');
    console.log(`MetaverseAdditionFacet deployed to: ${metaverseAdditionFacet.address}`);

    console.log('Deploying ERC721OldHolder...');
    const erc721OldHolderFacet = await Deployer.deployContract('ERC721OldHolder');
    console.log(`ERC721OldHolder deployed to: ${erc721OldHolderFacet.address}`);

    console.log('Deploying MarketplaceFacet...');
    const marketplaceFacet = await Deployer.deployContract('MarketplaceFacet');
    console.log(`MarketplaceFacet deployed to: ${marketplaceFacet.address}`);

    console.log('Deploying MetaverseConsumableAdapterFacet...');
    const metaverseConsumableAdapterFacet = await Deployer.deployContract('MetaverseConsumableAdapterFacet');
    console.log(`MetaverseConsumableAdapterFacet deployed to: ${metaverseConsumableAdapterFacet.address}`);

    console.log('Deploying DecentralandFacet...');
    const decentralandFacet = await Deployer.deployContract('DecentralandFacet');
    console.log(`DecentralandFacet deployed to: ${decentralandFacet.address}`);

    console.log('Deploying RentFacet...');
    const rentFacet = await Deployer.deployContract('RentFacet');
    console.log(`RentFacet deployed to: ${rentFacet.address}`);

    console.log('Deploying ReferralFacet...');
    const referralFacet = await Deployer.deployContract('ReferralFacet');
    console.log(`ReferralFacet deployed to: ${referralFacet.address}`);

    console.log('Deploying LandWorks (Diamond)...');
    const diamond = await Deployer.deployDiamond(
        'LandWorks',
        [
            cutFacet, loupeFacet, ownershipFacet, feeFacet, erc721Facet, metaverseAdditionFacet, erc721OldHolderFacet,
            marketplaceFacet, metaverseConsumableAdapterFacet, decentralandFacet, rentFacet, referralFacet
        ],
        deployerAddress,
    );
    console.log(`LandWorks (Diamond) deployed at: ${diamond.address}`);

    console.log(`Initialising LandWorks NFT...`);
    const landWorks = await ethers.getContractAt("ILandWorks", diamond.address);
    await landWorks.initERC721(ERC721_NAME, ERC721_SYMBOL, ERC721_BASE_URI);

    console.log(`Enabling ETH as Payment Type...`);
    await landWorks.setTokenPayment(ADDRESS_ONE, FEE_PERCENTAGE, true);

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

    console.log('Verifying MetaverseAdditionFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: metaverseAdditionFacet.address,
        constructorArguments: []
    });

    console.log('Verifying ERC721OldHolder on Etherscan...');
    await hardhat.run('verify:verify', {
        address: erc721OldHolderFacet.address,
        constructorArguments: []
    });

    console.log('Verifying MarketplaceFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: marketplaceFacet.address,
        constructorArguments: []
    });

    console.log('Verifying MetaverseConsumableAdapterFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: metaverseConsumableAdapterFacet.address,
        constructorArguments: []
    });

    console.log('Verifying DecentralandFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: decentralandFacet.address,
        constructorArguments: []
    });

    console.log('Verifying RentFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: rentFacet.address,
        constructorArguments: []
    });

    console.log('Verifying ReferralFacet on Etherscan...');
    await hardhat.run('verify:verify', {
        address: referralFacet.address,
        constructorArguments: []
    });

    console.log('Verifying LandWorks (Diamond) on Etherscan...');
    await hardhat.run('verify:verify', {
        address: diamond.address,
        constructorArguments: [
            Diamond.getAsAddCuts(
                [
                    cutFacet, loupeFacet, ownershipFacet, feeFacet, erc721Facet, metaverseAdditionFacet, erc721OldHolderFacet,
                    marketplaceFacet, metaverseConsumableAdapterFacet, decentralandFacet, rentFacet, referralFacet
                ]),
            deployerAddress
        ]
    });

    console.log(`Finished Deployment!`);
    console.log('DiamondCutFacet address: ', cutFacet.address);
    console.log('DiamondLoupeFacet address: ', loupeFacet.address);
    console.log('OwnershipFacet address: ', ownershipFacet.address);
    console.log('FeeFacet address: ', feeFacet.address);
    console.log('ERC-721Facet address: ', erc721Facet.address);
    console.log('MetaverseAdditionFacet address: ', metaverseAdditionFacet.address);
    console.log('ERC721OldHolder address', erc721OldHolderFacet.address);
    console.log('MarketplaceFacet address: ', marketplaceFacet.address);
    console.log('MetaverseConsumableAdapterFacet address: ', metaverseConsumableAdapterFacet.address);
    console.log('DecentralandFacet address: ', decentralandFacet.address);
    console.log('RentFacet address: ', rentFacet.address);
    console.log('ReferralFacet address: ', referralFacet.address);
    console.log('LandWorks (Diamond) address: ', diamond.address);
}

module.exports = deploy;