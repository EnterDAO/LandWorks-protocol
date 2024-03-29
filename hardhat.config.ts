import { task } from 'hardhat/config';
import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import * as config from './config';

task('deploy', 'Deploys the LandWorks Diamond with all of its facets')
    .setAction(async () => {
        const deployLandWorks = require('./scripts/deploy');
        await deployLandWorks();
    });

task('removeMarketplaceDCLFacets', 'Removes MarketplaceFacet & DecentralandFacet from LandWorks Diamond' +
    ' contract')
    .addParam('diamond', 'The address of the Diamond Contract')
    .addParam('marketplaceFacet', 'The address of MarketplaceFacet')
    .addParam('decentralandFacet', 'The address of DecentralandFacet')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const removeMarketplaceDCLFacets = require('./scripts/remove-marketplace-dcl-facets');
        await removeMarketplaceDCLFacets(taskArgs.diamond, taskArgs.marketplaceFacet, taskArgs.decentralandFacet);
    });

task('addMarketplaceDCLFacets', 'Deploys MarketplaceFacet & DecentralandFacet and Adds them to LandWorks' +
    'Diamond contract')
    .addParam('diamond', 'The address of the Diamond Contract')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const addMarketplaceDCLFacets = require('./scripts/add-marketplace-dcl-facets');
        await addMarketplaceDCLFacets(taskArgs.diamond);
    });

task('addConsumableAdapterFacet', 'Deploys MetaverseConsumableAdapterFacet and adds it to Diamond')
    .addParam('diamond', 'The address of the Diamond Contract')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const addConsumableAdapterFacet = require('./scripts/add-metaverse-consumable-adapter-facet');
        await addConsumableAdapterFacet(taskArgs.diamond);
    });

task('replaceMarketplaceFacet', 'Deploys MetaverseFacet & replaces all the function signatures of the previous')
    .addParam('diamond', 'The address of the Diamond Contract')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const replaceMarketplaceFacet = require('./scripts/replace-marketplace-facet');
        await replaceMarketplaceFacet(taskArgs.diamond);
    });

task('addMetaverseAdditionFacet', 'Deploys MetaverseAdditionFacet & adds it to the Diamond Contract')
    .addParam('diamond', 'The address of the Diamond Contract')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const addMetaverseAdditionFacet = require('./scripts/add-metaverse-addition-facet');
        await addMetaverseAdditionFacet(taskArgs.diamond);
    });

task('transferOwnership', 'Transfers Ownership of the Diamond Contract')
    .addParam('diamond', 'The address of the Diamond Contract')
    .addParam('newOwner', 'The address of the new owner.')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const transferOwnership = require('./scripts/transfer-ownership');
        await transferOwnership(taskArgs.diamond, taskArgs.newOwner);
    });

task('setDCLAdminOperator', 'Updates the Decentraland Admin Operator')
    .addParam('diamond', 'The address of the Diamond Contract')
    .addParam('adminOperator', 'The address of the Administrative Operator')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const updateAdminOperator = require('./scripts/set-DCL-admin-operator');
        await updateAdminOperator(taskArgs.diamond, taskArgs.adminOperator);
    })

task('addERC721OldHolder', 'Updates LW to support old ERC-721 onERC721Received')
    .addParam('diamond', 'The address of the Diamond Contract')
    .setAction(async (taskArgs) => {
        console.log(taskArgs);
        const addERC721OldHolder = require('./scripts/add-erc721-old-receiver-facet');
        await addERC721OldHolder(taskArgs.diamond);
    });

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.10"
            },
            {
                version: "0.4.24" // LAND Mock
            },
            {
                version: "0.4.23" // LAND Mock
            },
            {
                version: "0.4.22" // LAND Mock
            },
            {
                version: "0.4.18" // LAND Mock
            }
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 9999,
            },
        },
    },
    defaultNetwork: 'hardhat',
    networks: config.networks,
    etherscan: config.etherscan,
    abiExporter: {
        only: ['LandWorks', 'DiamondCutFacet', 'DiamondLoupeFacet', 'OwnershipFacet', 'IFeeFacet', 'IMarketplaceFacet', 'IDecentralandFacet', 'ERC721Facet'],
        except: ['.*Mock$'],
        clear: true,
        flat: true,
    },
    gasReporter: {
        enabled: true,
    }
};
