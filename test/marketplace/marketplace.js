const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", () => {
  let [
    admin,
    seller,
    buyer,
    feeRecipient,
    samplePaymentToken,
    samplePaymentToken2,
  ] = [];
  let petty;
  let gold;
  let simpleToken;
  let marketplace;
  let defaultFeeRate = 10;
  let defaultFeeDecimal = 0;
  let defaultPrice = ethers.utils.parseEther("100");
  let defaultBalance = ethers.utils.parseEther("10000");
  let address0 = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [
      admin,
      seller,
      buyer,
      feeRecipient,
      samplePaymentToken,
      samplePaymentToken2,
    ] = await ethers.getSigners();

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
  });

  describe("common", async () => {
    it("feeDecimal should return correct value", async () => {
      expect(await marketplace.feeDecimal()).to.be.equal(defaultFeeDecimal);
    });
    it("feeRate should return correct value", async () => {
      expect(await marketplace.feeRate()).to.be.equal(defaultFeeRate);
    });
    it("feeRecipient should return correct value", async () => {
      expect(await marketplace.feeRecipient()).to.be.equal(
        feeRecipient.address
      );
    });
  });

  describe("updateFeeRecipient", async () => {
    it("should revert if feeRecipient is address 0 ", async () => {
      await expect(marketplace.updateFeeRecipient(address0)).to.be.revertedWith(
        "NFTMarketplace: feeRecipient is zero address"
      );
    });

    it("should revert if sender isn't contract owner", async () => {
      await expect(
        marketplace.connect(seller).updateFeeRecipient(seller.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should update correctly", async () => {
      await marketplace.updateFeeRecipient(seller.address);
      expect(await marketplace.feeRecipient()).to.be.equal(seller.address);
    });
  });

  describe("updateFeeRate", async () => {
    it("should revert if feeRate >= 10^(feeDecimal + 2)", async () => {
      await expect(marketplace.updateFeeRate(1000, 0)).to.be.reverted;
    });

    it("should revert if sender isn't contract owner", async () => {
      await expect(marketplace.connect(seller).updateFeeRate(1, 1)).to.be
        .reverted;
    });

    it("should update correctly", async () => {
      const updateTxn = await marketplace.updateFeeRate(1, 1);
      await expect(updateTxn)
        .to.be.emit(marketplace, "FeeRateUpdate")
        .withArgs(1, 1);
    });
  });

  describe("addPaymentToken", async () => {
    it("should revert if paymentToken is address 0", async () => {
      await expect(marketplace.addPaymentToken(address0)).to.be.reverted;
    });

    it("should revert if paymentToken already support", async () => {
      await expect(marketplace.addPaymentToken(gold.address)).to.be.reverted;
    });

    it("should revert if sender is not contract owner", async () => {
      await expect(marketplace.connect(seller).addPaymentToken(gold.address)).to
        .be.reverted;
    });

    it("should add payment token correctly", async () => {
      await marketplace.addPaymentToken(samplePaymentToken.address);
      expect(
        await marketplace.isPaymentSupported(samplePaymentToken.address)
      ).to.be.equal(true);
    });
  });

  describe("addOrder", async () => {
    beforeEach(async () => {
      await petty.mint(seller.address);
    });

    it("should revert if paymentToken is not supported", async () => {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await expect(
        marketplace
          .connect(seller)
          .addOrder(1, defaultPrice, samplePaymentToken.address)
      ).to.be.revertedWith("NFTMarketplace: unsupport payment token");
    });

    it("should revert if sender is not nft owner", async () => {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await expect(
        marketplace.connect(buyer).addOrder(1, defaultPrice, gold.address)
      ).to.be.reverted;
    });

    it("should revert if nft hasn't been approve for marketplace contract", async () => {
      await expect(
        marketplace.connect(seller).addOrder(1, defaultPrice, gold.address)
      ).to.be.reverted;
    });

    it("should revert if price == 0", async () => {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await expect(
        marketplace.connect(seller).addOrder(1, 0, gold.address)
      ).to.be.revertedWith("NFTMarketplace: price must be greater than 0");
    });

    it("should add payment token correctly", async () => {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);

      const addOrderTxn = await marketplace
        .connect(seller)
        .addOrder(1, defaultPrice, gold.address);

      await expect(addOrderTxn)
        .to.be.emit(marketplace, "OrderAdded")
        .withArgs(1, seller.address, 1, gold.address, defaultPrice);
    });
  });

  describe("cancelOrder", async () => {
    beforeEach(async () => {
      await petty.mint(seller.address);
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(seller).addOrder(1, defaultPrice, gold.address);
    });
    it("should revert if order has been sold", async () => {
      await gold.connect(buyer).approve(marketplace.address, defaultPrice);
      await marketplace.connect(buyer).executeOrder(1);

      await expect(
        marketplace.connect(seller).cancelOrder(1)
      ).to.be.revertedWith("NFTMarketplace: buyer must be zero");
    });

    it("should revert if sender is not order owner", async () => {
      await expect(
        marketplace.connect(buyer).cancelOrder(1)
      ).to.be.revertedWith("NFTMarketplace: must be owner");
    });

    it("should cancel correctly", async () => {
      const cancelTxn = await marketplace.connect(seller).cancelOrder(1);

      await expect(cancelTxn)
        .to.be.emit(marketplace, "OrderCanceled")
        .withArgs(1);
    });
  });

  describe("executeOrder", function () {
    beforeEach(async () => {
      await petty.mint(seller.address);
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(seller).addOrder(1, defaultPrice, gold.address);
      await gold.connect(buyer).approve(marketplace.address, defaultPrice);
    });
    it("should revert if sender is seller", async function () {
      await expect(
        marketplace.connect(seller).executeOrder(1)
      ).to.be.revertedWith(
        "NFTMarketplace: buyer must be different from seller"
      );
    });
    it("should revert if order has been sold", async function () {
      await marketplace.connect(buyer).executeOrder(1);
      await expect(
        marketplace.connect(buyer).executeOrder(1)
      ).to.be.revertedWith("NFTMarketplace: buyer must be zero");
    });
    it("should revert if order has been cancel", async function () {
      await marketplace.connect(seller).cancelOrder(1);
      await expect(
        marketplace.connect(seller).executeOrder(1)
      ).to.be.revertedWith("NFTMarketplace: order has been canceled");
    });
    it("should execute order correctly with default fee", async function () {
      const txn = await marketplace.connect(buyer).executeOrder(1);
      await expect(txn)
        .to.be.emit(marketplace, "OrderMatched")
        .withArgs(
          1,
          seller.address,
          buyer.address,
          1,
          gold.address,
          defaultPrice
        );
    });
    it("should execute order correctly with 0 fee", async function () {
      const updateTxn = await marketplace.updateFeeRate(0, 0);
      await expect(updateTxn)
        .to.be.emit(marketplace, "FeeRateUpdate")
        .withArgs(0, 0);

      const txn = await marketplace.connect(buyer).executeOrder(1);
      await expect(txn)
        .to.be.emit(marketplace, "OrderMatched")
        .withArgs(
          1,
          seller.address,
          buyer.address,
          1,
          gold.address,
          defaultPrice
        );
    });
    it("should execute order correctly with fee 1 = 99%", async function () {
      const updateTxn = await marketplace.updateFeeRate(0, 99);
      await expect(updateTxn)
        .to.be.emit(marketplace, "FeeRateUpdate")
        .withArgs(0, 99);

      const txn = await marketplace.connect(buyer).executeOrder(1);
      await expect(txn)
        .to.be.emit(marketplace, "OrderMatched")
        .withArgs(
          1,
          seller.address,
          buyer.address,
          1,
          gold.address,
          defaultPrice
        );
    });
    it("should execute order correctly with fee 2 = 10.11111%", async function () {
      const updateTxn = await marketplace.updateFeeRate(5, 1011111);
      await expect(updateTxn)
        .to.be.emit(marketplace, "FeeRateUpdate")
        .withArgs(5, 1011111);

      const txn = await marketplace.connect(buyer).executeOrder(1);
      await expect(txn)
        .to.be.emit(marketplace, "OrderMatched")
        .withArgs(
          1,
          seller.address,
          buyer.address,
          1,
          gold.address,
          defaultPrice
        );
    });
  });
});
