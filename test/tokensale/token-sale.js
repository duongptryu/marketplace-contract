const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSale", () => {
  let [accountA, accountB, accountC] = [];
  let gold;
  let tokenSale;

  beforeEach(async () => {
    [accountA, accountB, accountC] = await ethers.getSigners();
    const Gold = await ethers.getContractFactory("Gold");
    gold = await Gold.deploy();
    await gold.deployed();

    const TokenSale = await ethers.getContractFactory("TokenSale");
    tokenSale = await TokenSale.deploy(gold.address);
    await tokenSale.deployed();

    const transferTxn = await gold.transfer(
      tokenSale.address,
      ethers.utils.parseEther("8")
    );
    await transferTxn.wait();
  });

  it("value not reached min cap", async () => {
    await expect(
      tokenSale.buy({ value: ethers.utils.parseEther("0.0002") })
    ).to.be.revertedWith("TokenSale: value not reached min cap");
  });

  it("value buy exceeds max cap", async () => {
    await expect(
      tokenSale.buy({ value: ethers.utils.parseEther("11") })
    ).to.be.revertedWith("TokenSale: address trade exceeds hard cap");
  });

  it("Smart contract not enought token", async () => {
    await expect(
      tokenSale.buy({ value: ethers.utils.parseEther("0.09") })
    ).to.be.revertedWith("TokenSale: contract not enought token");
  });

  it("Buy token work exactly", async () => {
    await tokenSale
      .connect(accountB)
      .buy({ value: ethers.utils.parseEther("0.007") });
    expect(await gold.balanceOf(accountB.address)).to.be.equal(
      ethers.utils.parseEther("0.007").mul(100)
    );
  });
});
