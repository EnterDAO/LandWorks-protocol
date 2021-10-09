<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xy`). Detailed information and description can be found in the [Whitepaper](./Whitepaper.md).

## Development

[hardhat](https://hardhat.org/) - framework used for the development and testing of the contracts

After cloning, run:
```
cd LandWorks-contracts
npm install
```

### Compilation
Before you deploy the contracts, you will need to compile them using:

```
npx hardhat compile
```

### Deployment
Before running any `npx hardhat` scripts, you need to set the following environment variables
in [hardhat config](./hardhat.config.ts) 

```markdown
YOUR-INFURA-API-KEY
YOUR-ETHERSCAN-API-KEY
```

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
npx hardhat coverage
```