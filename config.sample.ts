import { NetworksUserConfig } from 'hardhat/types';
import { EtherscanConfig } from '@nomiclabs/hardhat-etherscan/dist/src/types';

export const networks: NetworksUserConfig = {
    hardhat: {
        allowUnlimitedContractSize: true // For Decentraland LAND Registry
    },
    coverage: {
        url: 'http://localhost:8555',
    },
    // rinkeby: {
    //     url: 'https://rinkeby.infura.io/v3/YOUR-INFURA-API-KEY',
    //     chainId: 4,
    //     accounts: [ "YOUR_PK_HERE" ]
    // },
    // mainnet: {
    //     url: 'https://mainnet.infura.io/v3/YOUR-INFURA-KEY',
    //     chainId: 1,
    //     accounts: [ "YOUR_PK_HERE" ]
    // },
};

export const etherscan: EtherscanConfig = {
    // apiKey: 'YOUR-ETHERSCAN-API-KEY',
};