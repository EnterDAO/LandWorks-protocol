import { Contract } from 'ethers';
import hardhat from 'hardhat';
import { ethers } from 'hardhat';
import { string } from 'hardhat/internal/core/params/argumentTypes';
import { Deployer } from '../utils/deployer';
import { Diamond } from "../utils/diamond";
import FacetCutAction = Diamond.FacetCutAction;

interface Asset {
  matches: boolean;
  id: number;
}

async function decentralandUpdateAssetsWithAdminOperators(diamondAddress: string, updaterAddress: string, metaverseId: number) {
  await hardhat.run('compile');

  const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);
  const totalRegistries = await landWorks.totalRegistries(metaverseId);

  const registries: Map<string, Contract> = new Map();
  for (let i = 0; i < totalRegistries; i++) {
    const registryAddress = await landWorks.registryAt(metaverseId, i);
    const contractInstance = await ethers.getContractAt("EstateRegistryMock", registryAddress);
    registries.set(registryAddress, contractInstance);
  }
  const administrativeOperator = await landWorks.administrativeOperator();

  const promises: Array<Promise<Asset>> = [];
  const totalSupply = await landWorks.totalSupply();
  console.log(`Total supply: [${totalSupply}]`);

  for (let i = 0; i < totalSupply; i++) {
    promises.push(canAssetBeUpdatedWithAdminOperator(landWorks, i, registries, administrativeOperator));
  }

  const assetsFound = await Promise.all(promises);
  const matchingAssets = assetsFound.filter(a => a.matches).map(a => a.id);
  console.log(`Assets found: [${matchingAssets}]`);

  if (matchingAssets.length == 0) {
    console.log('No matching assets found. Skipping transaction execution.');
    return;
  }
  console.log(`[${matchingAssets.length}] matching assets found.`);

  const updaterContract = await ethers.getContractAt("DecentralandAdminOperatorUpdater", updaterAddress);

  const chunk = 70;
  for (let i = 0, j = matchingAssets.length; i < j; i += chunk) {
    const slice = matchingAssets.slice(i, i + chunk);
    const tx = await updaterContract.updateAssetsAdministrativeState(landWorks.address, slice);
    console.log(`Tx [${tx.hash}] submitted. Waiting to be mined...`);

    await tx.wait();
    console.log(`Tx [${tx.hash}] mined successfully!`);
  }
}

async function canAssetBeUpdatedWithAdminOperator(landWorks: Contract, index: number, registries: Map<string, Contract>, administrativeOperator: string): Promise<Asset> {
  const tokenId = await landWorks.tokenByIndex(index);
  const asset = await landWorks.assetAt(tokenId);

  const registry = registries.get(asset.metaverseRegistry);
  if (registry == null) {
    console.log(`Asset [${tokenId}] does not have the proper registry.`);
    return {
      matches: false,
      id: tokenId,
    } as Asset;
  }

  const currentOperator = await registry.updateOperator(asset.metaverseAssetId);
  if (currentOperator === administrativeOperator) {
    console.log(`Asset [${tokenId}] has already set the admin operator.`);
    return {
      matches: false,
      id: tokenId,
    } as Asset;
  }

  if (asset.totalRents > 0) {
    const lastRent = await landWorks.rentAt(tokenId, asset.totalRents);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (lastRent.end > nowInSeconds) {
      console.log(`Asset [${tokenId}] has an active or future rent.`);
      return {
        matches: false,
        id: tokenId,
      } as Asset;
    }
  }

  return {
    matches: true,
    id: tokenId,
  } as Asset;
}

module.exports = decentralandUpdateAssetsWithAdminOperators;