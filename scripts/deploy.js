const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  let petty;
  let gold;
  let tokenSale;
  let reserve;
  let marketplace;
  let defaultFeeRate = 0;
  let defaultFeeDecimal = 0;

  const Petty = await ethers.getContractFactory("Petty");
  petty = await Petty.deploy();
  await petty.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
