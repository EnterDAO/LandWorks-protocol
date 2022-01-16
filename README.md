<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xyz). Detailed information and description can be found in the [Whitepaper](./Whitepaper.md).

Audits on the LandWorks Protocol and Yield Farming contracts:
- [Omega](audits/2021-12-Omega.pdf)

**Mainnet Deployment Addresses**
- `DiamondCutFacet`: `0x1b79b6ab45df32a003c9d6626df259672f7d72d2`
- `DiamondLoupeFacet`: `0x8e856B842ca3559D05d331313a20c86e7dBDF660`
- `OwnershipFacet`: `0xf743CF02312dd25060CEe1BF9fa42330194DE971`
- `FeeFacet`: `0x4b1c9B5609d9e2f6217974eeA2FDc65eEeaFDf5a`
- `ERC-721Facet`: `0xCda40910dD8e0b175D941adEBfCf78e4bEf508E7`
- `MarketplaceFacet`: `0x9f7e14c23811dBc2609fc2C95C15b703088c98C7`
- `DecentralandFacet`: `0xf1912034c9Fa18635db834875d091b447dFE7850`
- `LandWorks (Diamond)`: `0x1939ff586bf18f7B0fd7C254dBd47432f4DFfEF9`

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