<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/EnterDAO/LandWorks-contracts/actions/workflows/test.yml)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xyz). Detailed information and description can be found in the [Whitepaper](./Whitepaper.md).

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