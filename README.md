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
in [hardhat config](./hardhat.config.js) 
TODO 

* Deploys all the facets
* Deploys the LandWorks Diamond with all the facets as diamond cuts

TODO bash script

### Tests

#### Unit Tests
```bash
npx hardhat test
```

#### Coverage
```bash
npx hardhat coverage
```