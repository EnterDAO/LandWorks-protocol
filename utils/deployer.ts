import {Contract, ContractFactory} from "ethers";
import {ethers} from "hardhat";
import {Diamond} from "./diamond";

/**
 * Interface providing utility functions for Contract / Diamond deployment
 */
export namespace Deployer {

    /**
     * Deploys a contract by a given name and provided arguments
     * @param name name of the contract
     * @param args arguments to pass to the constructor
     */
    export async function deployContract(name: string, args?: Array<any>): Promise<Contract> {
        const factory: ContractFactory = await ethers.getContractFactory(name);
        const ctr: Contract = await factory.deploy(...(args || []));
        await ctr.deployed();

        return ctr;
    }

    /**
     * Deploys the specified diamond along with its facets and provided arguments
     * @param name name of the diamond
     * @param facets list of {@link Contract} facets to include
     * @param owner the initial owner of the diamond
     */
    export async function deployDiamond (name: string, facets: Array<Contract>, owner: string): Promise<Contract> {
        const diamondCut = Diamond.getDiamondCut(facets);
        const diamondFactory: ContractFactory = await ethers.getContractFactory(name);
        const deployedDiamond: Contract = await diamondFactory.deploy(diamondCut, owner);
        await deployedDiamond.deployed();

        return deployedDiamond;
    }
}