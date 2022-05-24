const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("Marketplace-Auction", () => {
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
  let marketplaceAuction;
  let defaultFeeRate = 10;
  let defaultFeeDecimal = 0;
  let defaultPrice = ethers.utils.parseEther("100");
  let defaultBalance = ethers.utils.parseEther("10000");
  let address0 = "0x0000000000000000000000000000000000000000";
  let oneDay = 86400000;
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

    const MarketplaceAuction = await ethers.getContractFactory(
      "MarketplaceAuction"
    );
    marketplaceAuction = await MarketplaceAuction.deploy(
      petty.address,
      defaultFeeDecimal,
      defaultFeeRate,
      feeRecipient.address
    );
    await marketplaceAuction.deployed();
    await marketplaceAuction.addPaymentToken(gold.address);
    await gold.transfer(seller.address, defaultBalance);
    await gold.transfer(buyer.address, defaultBalance);
  });

  describe("common", () => {
    it("feeDecimal should return correct value", async () => {
      expect(await marketplaceAuction.feeDecimal()).to.be.equal(
        defaultFeeDecimal
      );
    });
    it("feeRate should return correct value", async () => {
      expect(await marketplaceAuction.feeRate()).to.be.equal(defaultFeeRate);
    });
    it("feeRecipient should return correct value", async () => {
      expect(await marketplaceAuction.feeRecipient()).to.be.equal(
        feeRecipient.address
      );
    });
  });

  describe("updateFeeRecipient", () => {
    it("should revert if feeRecipient is address 0 ", async () => {
      await expect(
        marketplaceAuction.updateFeeRecipient(address0)
      ).to.be.revertedWith("NFTMarketplace: feeRecipient is zero address");
    });

    it("should revert if sender isn't contract owner", async () => {
      await expect(
        marketplaceAuction.connect(seller).updateFeeRecipient(seller.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should update correctly", async () => {
      await marketplaceAuction.updateFeeRecipient(seller.address);
      expect(await marketplaceAuction.feeRecipient()).to.be.equal(
        seller.address
      );
    });
  });

  describe("updateFeeRate", () => {
    it("should revert if feeRate >= 10^(feeDecimal + 2)", async () => {
      await expect(marketplaceAuction.updateFeeRate(1000, 0)).to.be.reverted;
    });

    it("should revert if sender isn't contract owner", async () => {
      await expect(marketplaceAuction.connect(seller).updateFeeRate(1, 1)).to.be
        .reverted;
    });

    it("should update correctly", async () => {
      const updateTxn = await marketplaceAuction.updateFeeRate(1, 1);
      await expect(updateTxn)
        .to.be.emit(marketplaceAuction, "FeeRateUpdate")
        .withArgs(1, 1);
    });
  });

  describe("addPaymentToken", () => {
    it("should revert if paymentToken is address 0", async () => {
      await expect(marketplaceAuction.addPaymentToken(address0)).to.be.reverted;
    });

    it("should revert if paymentToken already support", async () => {
      await expect(marketplaceAuction.addPaymentToken(gold.address)).to.be
        .reverted;
    });

    it("should revert if sender is not contract owner", async () => {
      await expect(
        marketplaceAuction.connect(seller).addPaymentToken(gold.address)
      ).to.be.reverted;
    });

    it("should add payment token correctly", async () => {
      await marketplaceAuction.addPaymentToken(samplePaymentToken.address);
      expect(
        await marketplaceAuction.isPaymentSupported(samplePaymentToken.address)
      ).to.be.equal(true);
    });
  });

  describe("add auction", () => {
    beforeEach(async () => {
      const mintNftTx = await petty.mint(admin.address);
      await mintNftTx.wait();
    });

    it("should revert if price <= 0", async () => {
      await expect(
        marketplaceAuction.addAuction(1, gold.address, 0, 0, oneDay)
      ).to.be.revertedWith("NFTMarketplace: min price must be greater than 0");
    });
    it("should revert if lowest price increase < 0", async () => {
      await expect(
        marketplaceAuction.addAuction(
          1,
          gold.address,
          ethers.utils.parseEther("1"),
          0,
          oneDay
        )
      ).to.be.revertedWith(
        "NFTMarketplace: lowest price increase must be greater than 0"
      );
    });
    it("should revert if nft not approved yet", async () => {
      await expect(
        marketplaceAuction.addAuction(
          1,
          gold.address,
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("0.5"),
          oneDay
        )
      ).to.be.revertedWith(
        "NFTMarketplace: The contract is unauthorized  to manage this token"
      );
    });
    it("should revert if time auction < 1 hours", async () => {
      const approveTx = await petty.setApprovalForAll(
        marketplaceAuction.address,
        true
      );
      await approveTx.wait();
      await expect(
        marketplaceAuction.addAuction(
          1,
          gold.address,
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("0.5"),
          125
        )
      ).to.be.revertedWith(
        "NFTMarketplace: Time auction must be greater than 1 hours"
      );
    });
    it("should add auction work correctly", async () => {
      const approveTx = await petty.setApprovalForAll(
        marketplaceAuction.address,
        true
      );
      await approveTx.wait();

      const addTx = await marketplaceAuction.addAuction(
        1,
        gold.address,
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("0.5"),
        oneDay
      );

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);

      await expect(addTx)
        .to.be.emit(marketplaceAuction, "AuctionAdded")
        .withArgs(
          1,
          admin.address,
          1,
          gold.address,
          ethers.utils.parseEther("1"),
          block.timestamp,
          oneDay
        );
    });
  });
  describe("cancel auction", () => {
    beforeEach(async () => {
      const tx = await gold.transfer(
        buyer.address,
        ethers.utils.parseEther("5")
      );
      await tx.wait();

      const mintNftTx = await petty.mint(admin.address);
      await mintNftTx.wait();

      const approveTx = await petty.setApprovalForAll(
        marketplaceAuction.address,
        true
      );
      await approveTx.wait();

      const addTx = await marketplaceAuction.addAuction(
        1,
        gold.address,
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("0.5"),
        oneDay
      );
      await addTx.wait();
    });

    it("should revert if not owner", async () => {
      await expect(
        marketplaceAuction.connect(buyer).cancelAuction(1)
      ).to.be.revertedWith("NFTMarketplace: not auction owner");
    });

    it("should revert if already has offer", async () => {
      await gold
        .connect(buyer)
        .approve(marketplaceAuction.address, ethers.utils.parseEther("2"));
      await marketplaceAuction
        .connect(buyer)
        .addOffer(1, ethers.utils.parseEther("2"));

      await expect(marketplaceAuction.cancelAuction(1)).to.be.revertedWith(
        "NFTMarketplace: highest offer must be equal to 0"
      );
    });

    it("should work correctly", async () => {
      const tx = await marketplaceAuction.cancelAuction(1);
      await expect(tx)
        .to.be.emit(marketplaceAuction, "AuctionCancel")
        .withArgs(1);
    });
  });
  describe("add offer", () => {});
  describe("Claim NFT", () => {});
  describe("Refund token", () => {});
});
