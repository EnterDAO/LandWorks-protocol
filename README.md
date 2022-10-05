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
- `FeeFacet`: `0xFd448dA43dC9Cb457E35Ac1BEf39670bCeEC350A`
- `ERC-721Facet`: `0xD16efB45ac2b88Eb94970613397c87d256821281`
- `MarketplaceFacet`: `0x51a3701e64c68bE650F2Fdb829BD3d62E7Fc9115`
- `DecentralandFacet`: `0x9B7D1d4266887B24fd22c229F627459Cd116c32e`
- `MetaverseAdditionFacet`: `0x8fb39Bb931AC9C124c068050087d54A551fca23b`
- `MetaverseConsumableAdapterFacet`: `0xaDeB3078f47750f0b891E5c5F9beeF25a7eDAF89`
- `RentFacet`: `0x0939feE48bd5e8CfC8A96a9Ecaf135C5b2b7943b`
- `ReferralFacet`: `0xD207074184b6FddC0104d3CA093A94B005E21cA6`
- `ERC721OldHolder`: `0x4a2B97c0f81B55C9bAFa6266E191B9B04741EA97`
- `LandWorks (Diamond)`: `0x678D837fA15eba2B59f6CD5F9F4C580AC2Dfc269`

**Testnet Rinkeby Deployment Addresses**
- `DiamondCutFacet`: `0xd8Db904252480915Ef2619851C0Ea51437c96f73`
- `DiamondLoupeFacet`: `0x5D875Da9C052Cb92119AF4a359C97F3364DDaFB6`
- `OwnershipFacet`: `0x2d82c46e1CfD3fa98770e6c15D65FE3D08290DDe`
- `FeeFacet`: `0x16cF3F85db7aaB3E30DCEFEee0289fB431F221cb`
- `ERC-721Facet`: `0x4c08D852c710163a4e0Afe516558c5332D9dc7Dd`
- `MarketplaceFacet`: `0x4b16602890A2fb185b60efaBEDf9383bcA01083f`
- `DecentralandFacet`: `0x61c905488dF112A3ae2F7AfcB170c5F938DEf31a`
- `MetaverseAdditionFacet`: `0xaF6Af20D8F7Ae54Dab7570486220ecA94024f06d`
- `MetaverseConsumableAdapterFacet`: `0xf0b163722b7953c4162217e7A3F7b5728fDc9A99`
- `RentFacet`: `0x991c8ff1803B63065934d1300a63791648aFcb1d`
- `ReferralFacet`: `0x0aA472eF704269E69Ae5fef295Fd35af6681D631`
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
