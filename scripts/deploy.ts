import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractFactory("EnergyVampires");

  // Start deployment, returning a promise that resolves to a contract object
  const hello_world = await contract.deploy();
  console.log("Contract deployed to address:", hello_world);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });