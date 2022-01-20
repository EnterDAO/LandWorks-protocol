<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xyz). Detailed information and description can be found in the [Whitepaper](./Whitepaper.md).

Audits on the LandWorks Protocol and Yield Farming contracts:
- [Omega](audits/2021-12-Omega.pdf)

**Mainnet Deployment Addresses**
- `DiamondCutFacet`: `0xd86a91c5a96adede0d79ae11c63541f336d48a08`
- `DiamondLoupeFacet`: `0x1c2fe56a7fa18e08e2cf1e8ac8543b9b190d1be1`
- `OwnershipFacet`: `0x620d20a801c4e3c3d83a88354cc57b904998d137`
- `FeeFacet`: `0x6c567026f5a1cd09313170ec77adbbf08fa7f409`
- `ERC-721Facet`: `0x4e0ea52c528647cec98e78cfc1770f9e4e814204`
- `MarketplaceFacet`: `0x22427c5c6b62837aed5a812c5d01341935034dd8`
- `DecentralandFacet`: `0x3482121020facfc24dca3bbc5c7139006fad8599`
- `LandWorks (Diamond)`: `0x678D837fA15eba2B59f6CD5F9F4C580AC2Dfc269`

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