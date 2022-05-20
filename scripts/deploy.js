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
  console.log("Petty contract is deployed to address ", petty.address);

  const Gold = await ethers.getContractFactory("Gold");
  gold = await Gold.deploy();
  await gold.deployed();
  console.log("Gold contract is deployed to address ", gold.address);

  const TokenSale = await ethers.getContractFactory("TokenSale");
  tokenSale = await TokenSale.deploy(gold.address);
  await tokenSale.deployed();
  const transferTxn = await gold.transfer(
    tokenSale.address,
    ethers.utils.parseEther("1000000")
  );
  await transferTxn.wait();
  console.log("TokenSale contract is deployed to address ", tokenSale.address);

  const Reserve = await ethers.getContractFactory("Reserve");
  reserve = await Reserve.deploy(gold.address);
  await reserve.deployed();
  console.log("Reserve contract is deployed to address ", reserve.address);

  const Marketplace = await ethers.getContractFactory("Marketplace");
  marketplace = await Marketplace.deploy(
    petty.address,
    defaultFeeDecimal,
    defaultFeeRate,
    reserve.address
  );
  await marketplace.deployed();
  console.log(
    "Marketplace contract is deployed to address ",
    marketplace.address
  );

  const addPaymentTxn = await marketplace.addPaymentToken(gold.address);
  await addPaymentTxn.wait();
  console.log(
    "Gold is payment token? true or false:",
    await marketplace.isPaymentSupported(gold.address)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
