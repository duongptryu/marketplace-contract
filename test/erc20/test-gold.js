const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20 contract - GOLD", function () {
  let [accountA, accountB, accountC] = [];
  let token;
  let amount = ethers.utils.parseUnits("100", "ether");
  let totalSupply = ethers.utils.parseUnits("1000000", "ether");

  beforeEach(async () => {
    [accountA, accountB, accountC] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Gold");
    token = await Token.deploy();
    await token.deployed();
  });

  describe("common", function () {
    it("Total supply should return right value", async function () {
      expect(await token.totalSupply()).to.be.equal(totalSupply);
    });

    it("Account A should return right value", async function () {
      expect((await token.balanceOf(accountA.address)) == totalSupply);
    });

    it("Account B should return right value", async function () {
      expect((await token.balanceOf(accountB.address)) == 0);
    });
  });

  describe("pause()", function () {
    it("Should revert if account is not have PAUSER_ROLE", async function () {
      await expect(token.connect(accountB).pause()).to.be.reverted;
    });

    it("Should revert if the token already paused", async function () {
      await token.pause();
      await expect(token.pause()).to.be.reverted;
    });

    it("Should pause function work correctly", async function () {
      const pauseTx = await token.pause();
      await expect(pauseTx)
        .to.be.emit(token, "Paused")
        .withArgs(accountA.address);
      await expect(token.transfer(accountB.address, amount)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("unpause()", function () {
    it("Should revert if account is not have PAUSER_ROLE", async function () {
      await expect(token.connect(accountB).unpause()).to.be.reverted;
    });

    it("Should revert if the token running", async function () {
      await expect(token.unpause()).to.be.reverted;
    });

    it("Should revert if the token already unpaused", async function () {
      await token.pause();
      await token.unpause();
      await expect(token.unpause()).to.be.revertedWith("Pausable: not paused");
    });

    it("Should pause function work correctly", async function () {
      const pauseTx = await token.pause();
      await expect(pauseTx)
        .to.be.emit(token, "Paused")
        .withArgs(accountA.address);
      await expect(token.transfer(accountB.address, amount)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });
});
