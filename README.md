<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xyz).

Detailed information and description can be found [here](https://docs.landworks.xyz/). 

Initial [Whitepaper](./Whitepaper.md).

Audits on the LandWorks Protocol and Yield Farming contracts:
- [Omega](audits/2021-12-Omega.pdf)

**Mainnet Deployment Addresses**
- `DiamondCutFacet`: `0xd86a91c5a96adede0d79ae11c63541f336d48a08`
- `DiamondLoupeFacet`: `0x1c2fe56a7fa18e08e2cf1e8ac8543b9b190d1be1`
- `OwnershipFacet`: `0x620d20a801c4e3c3d83a88354cc57b904998d137`
- `FeeFacet`: `0x6c567026f5a1cd09313170ec77adbbf08fa7f409`
- `ERC-721Facet`: `0x4e0ea52c528647cec98e78cfc1770f9e4e814204`
- `MarketplaceFacet`: `0xF74dECe647bF75e86c0c78486F228a7C5475c652`
- `DecentralandFacet`: `0xdd65d876f00a4203dc9be33b2728852d3bd7e61c`
- `LandWorks (Diamond)`: `0x678D837fA15eba2B59f6CD5F9F4C580AC2Dfc269`

**Testnet Rinkeby Deployment Addresses**
- `DiamondCutFacet`: `0xd8Db904252480915Ef2619851C0Ea51437c96f73`
- `DiamondLoupeFacet`: `0x5D875Da9C052Cb92119AF4a359C97F3364DDaFB6`
- `OwnershipFacet`: `0x2d82c46e1CfD3fa98770e6c15D65FE3D08290DDe`
- `FeeFacet`: `0x2aCaEcDea5BbC47D943359E17E3a30757aD3C93D`
- `ERC-721Facet`: `0xB770E9ca6cFAe93fA0adC0E5e1157A6D6D9f2674`
- `MarketplaceFacet`: `0x50137Dc06e255Be69a1B08864f17A235A942f2D7`
- `DecentralandFacet`: `0xD0e091d5401d5Eff1d22436B05175F1076349b24`
- `LandWorks (Diamond)`: `0x1B39D334302e1F077442516488300a860C8cfC14`

## Development

[hardhat](https://hardhat.org/) - framework used for the development and testing of the contracts

After cloning, run:
```
cd LandWorks-contracts
npm install
```

### Compilation
**Prerequisite**

Before running the deploy `npx hardhat` script, you need to create and populate the `config.ts` file. You can use the `config.sample.ts` file and populate the following variables:

```markdown
YOUR-INFURA-API-KEY
YOUR-ETHERSCAN-API-KEY
```

Before you deploy the contracts, you will need to compile them using:

```
npx hardhat compile
```

### Deployment

**Deployment Script**
* Deploys all the facets
* Deploys the LandWorks Diamond with all the facets as diamond cuts
* Inits the LandWorks Diamond with the provided `owner` address
* Verifies all deployed contracts in Etherscan

```shell
npx hardhat deploy \
    --network <network name> 
```

### Tests

#### Unit Tests
```bash
npx hardhat test
```

#### Coverage

```bash
npm run coverage
```

or 

```bash
npx hardhat coverage --solcoverjs .solcover.ts
```