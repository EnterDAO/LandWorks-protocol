import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import * as config from './config';

task('deploy', 'Deploys the LandWorks Diamond with all of its facets')
    .setAction(async () => {
        const deployLandWorks = require('./scripts/deploy');
        await deployLandWorks();
    });

task('rentDecentraland', 'Rents decentraland')
    .addParam('landWorks', 'LandWorks contract address')
    .addParam('assetId', 'Id of the asset')
    .addParam('period', 'Period in seconds')
    .setAction(async (taskArgs) => {
        const rentDecentraland = require('./scripts/rentDecentraland');
        await rentDecentraland(taskArgs.landWorks, taskArgs.assetId, taskArgs.period);
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
    },
};
