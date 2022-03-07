import hardhat from 'hardhat';
import { ethers } from 'hardhat';

async function setDCLAdminOperator(diamondAddress: string, adminOperator: string) {

	await hardhat.run('compile');

	const landWorks = await ethers.getContractAt("ILandWorks", diamondAddress);

	const setAdminOperatorTx = await landWorks.updateAdministrativeOperator(adminOperator);
	console.log(`Setting Admin Operator [${setAdminOperatorTx.hash}] submitted, waiting to be mined...`);
	await setAdminOperatorTx.wait(5);

}

module.exports = setDCLAdminOperator;