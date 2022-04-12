const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", () => {
  let [admin, seller, buyer, feeRecipient, samplePaymentToken] = [];
  let petty;
  let gold;
  let Marketplace;
  let defaultFeeRate = 10;
  let defaultFeeDecimal = 0;
  let defaultPrice = ethers.utils.parseEther("100");
  let defaultBalance = ethers.utils.parseEther("10000");
  let address0 = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [admin, seller, buyer, feeRecipient, samplePaymentToken] =
      await ethers.getSigners();

    const Petty = await ethers.getContractFactory("Petty");
    petty = await Petty.deploy();
    await petty.deployed();

    const Gold = await ethers.getContractFactory("Gold");
    gold = await Gold.deploy();
    await gold.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(
      petty.address,
      defaultFeeDecimal,
      defaultFeeRate,
      feeRecipient.address
    );
    await marketplace.deployed();
    await marketplace.addPaymentToken(gold.address);
    await gold.transfer(seller.address, defaultBalance);
    await gold.transfer(buyer.address, defaultBalance);

    describe("common", async () => {
      it("feeDecimal should return correct value", async () => {});
      it("feeRate should return correct value", async () => {});
      it("feeRecipient should return correct value", async () => {});
    });

    describe("updateFeeRecipient", async () => {
      it("should revert if feeRecipient is address 0 ", async () => {});

      it("should revert if sender isn't contract owner", async () => {});

      it("should update correctly", async () => {});
    });

    describe("updateFeeRate", async () => {
      it("should revert if feeRate >= 10^(feeDecimal + 2)", async () => {});

      it("should revert if sender isn't contract owner", async () => {});

      it("should update correctly", async () => {});
    });

    describe("addPaymentToken", async () => {
      it("should revert if paymentToken is address 0", async () => {});

      it("should revert if paymentToken already support", async () => {});

      it("should revert if sender is not contract owner", async () => {});

      it("should add payment token correctly", async () => {});
    });

    describe("addOrder", async () => {
      beforeEach(async () => {
        await petty.mint(seller.address);
      });
      it("should revert if paymentToken is not supported", async () => {});

      it("should revert if sender is not nft owner", async () => {});

      it("should revert if nft hasn't been approve for marketplace contract", async () => {});

      it("should revert if price == 0", async () => {});

      it("should add payment token correctly", async () => {});
    });

    describe("cancelOrder", async () => {
      beforeEach(async () => {
        await petty.mint(seller.address);
        await petty
          .connect(seller)
          .setApprovalForAll(marketplace.address, true);
        await marketplace
          .connect(seller)
          .addOrder(1, gold.address, defaultPrice);
      });
      it("should revert if order has been sold", async () => {});

      it("should revert if sender is not order owner", async () => {});

      it("should cancel correctly", async () => {});
    });

    describe("executeOrder", function () {
      beforeEach(async () => {
        await petty.mint(seller.address);
        await petty
          .connect(seller)
          .setApprovalForAll(marketplace.address, true);
        await marketplace
          .connect(seller)
          .addOrder(1, gold.address, defaulPrice);
        await gold.connect(buyer).approve(marketplace.address, defaulPrice);
      });
      it("should revert if sender is seller", async function () {});
      it("should revert if order has been sold", async function () {});
      it("should revert if order has been cancel", async function () {});
      it("should execute order correctly with default fee", async function () {});
      it("should execute order correctly with 0 fee", async function () {});
      it("should execute order correctly with fee 1 = 99%", async function () {});
      it("should execute order correctly with fee 2 = 10.11111%", async function () {});
    });
  });
});
