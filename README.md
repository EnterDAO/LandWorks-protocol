<div align="center">

# LandWorks Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Unit Tests](https://github.com/EnterDAO/LandWorks-protocol/actions/workflows/test.yml/badge.svg)](https://github.com/EnterDAO/LandWorks-protocol/actions/workflows/test.yml)

</div>

LandWorks is a protocol, developed by [EnterDao](https://enterdao.xyz).

Detailed information and description can be found [here](https://docs.landworks.xyz/). 

Initial [Whitepaper](./Whitepaper.md).

Audits on the LandWorks Protocol and Yield Farming contracts:
- [Omega](audits/2021-12-Omega.pdf)
- [Quantstamp](audits/2022-03-Quantstamp.pdf)

**Mainnet Deployment Addresses**
- `DiamondCutFacet`: `0xd86a91c5a96adede0d79ae11c63541f336d48a08`
- `DiamondLoupeFacet`: `0x1c2fe56a7fa18e08e2cf1e8ac8543b9b190d1be1`
- `OwnershipFacet`: `0x620d20a801c4e3c3d83a88354cc57b904998d137`
- `FeeFacet`: `0x6c567026f5a1cd09313170ec77adbbf08fa7f409`
- `ERC-721Facet`: `0x4e0ea52c528647cec98e78cfc1770f9e4e814204`
- `MarketplaceFacet`: `0xfc4F61e2B432deBe686b9B5Dd079a9CC8aA4b688`
- `DecentralandFacet`: `0xaF0F14a7c001c77cf8FBA1f3ED68A14ae2Cf5aa8`
- `MetaverseAdditionFacet`: `0x8fb39Bb931AC9C124c068050087d54A551fca23b`
- `MetaverseConsumableAdapterFacet`: `0x1d5f19451F230D47988546e181a7C3E34cf8AC67`
- `ERC721OldHolder`: `0x4a2B97c0f81B55C9bAFa6266E191B9B04741EA97`
- `LandWorks (Diamond)`: `0x678D837fA15eba2B59f6CD5F9F4C580AC2Dfc269`

**Testnet Rinkeby Deployment Addresses**
- `DiamondCutFacet`: `0xd8Db904252480915Ef2619851C0Ea51437c96f73`
- `DiamondLoupeFacet`: `0x5D875Da9C052Cb92119AF4a359C97F3364DDaFB6`
- `OwnershipFacet`: `0x2d82c46e1CfD3fa98770e6c15D65FE3D08290DDe`
- `FeeFacet`: `0x2aCaEcDea5BbC47D943359E17E3a30757aD3C93D`
- `ERC-721Facet`: `0xB770E9ca6cFAe93fA0adC0E5e1157A6D6D9f2674`
- `MarketplaceFacet`: `0x9cF9E2aDEA5d16e33b1647e43Ac269Cc3818a890`
- `DecentralandFacet`: `0x8741924fc203097DCf75E0d274E1fE47c5FCe174`
- `MetaverseAdditionFacet`: `0xaF6Af20D8F7Ae54Dab7570486220ecA94024f06d`
- `MetaverseConsumableAdapterFacet`: `0x3Fa5a843e79Eb7d9413c753A62a8Da38b4Abcad6`
- `ERC721OldHolder`: `0x3a754461f1b447a81D486B6d91821cbD983d86D5`
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
