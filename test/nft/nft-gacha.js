const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("Petty NFT", function () {
  let [accountA, accountB, accountC] = [];
  let pettyGacha;
  let gold;
  let address0 = "0x0000000000000000000000000000000000000000";
  let defaultBalance = ethers.utils.parseEther("1000000000");
  let priceGacha1 = ethers.utils.parseEther("100");
  let priceGacha2 = ethers.utils.parseEther("200");
  let priceGacha3 = ethers.utils.parseEther("300");

  beforeEach(async () => {
    [accountA, accountB, accountC] = await ethers.getSigners();
    const Gold = await ethers.getContractFactory("Gold");
    gold = await Gold.deploy();
    await gold.deployed();

    const Petty = await ethers.getContractFactory("PettyGacha");
    pettyGacha = await Petty.deploy(gold.address);
    await pettyGacha.deployed();

    await gold.approve(pettyGacha.address, defaultBalance);
  });

  describe("openeGacha", function () {
    it("should revert if gahca nonexistent", async () => {
      await expect(pettyGacha.openGacha(7, 1)).to.be.revertedWith(
        "PettyGacha: Invalid gacha"
      );
    });

    it("should revert if price not match", async () => {
      await expect(pettyGacha.openGacha(1, 0)).to.be.revertedWith(
        "PettyGacha: price not match"
      );
    });

    it("should open gacha correctly gacha1", async () => {
      var times = 3;
      for (var i = 1; i <= times; i++) {
        await pettyGacha.openGacha(1, priceGacha1);
        const petty = await pettyGacha._tokenIdToPetty(i);
        console.log(petty);
        expect(await pettyGacha.ownerOf(i)).to.be.equal(accountA.address);
      }
      expect(await gold.balanceOf(pettyGacha.address)).to.be.equal(
        priceGacha1.mul(times)
      );
      expect(await gold.balanceOf(accountA.address)).to.be.equal(
        defaultBalance.sub(priceGacha1.mul(times))
      );
    });

    it("should open gacha correctly gacha2", async () => {
      var times = 3;
      for (var i = 1; i <= times; i++) {
        await pettyGacha.openGacha(2, priceGacha2);
        const petty = await pettyGacha._tokenIdToPetty(i);
        console.log(petty);
        expect(await pettyGacha.ownerOf(i)).to.be.equal(accountA.address);
      }
      expect(await gold.balanceOf(pettyGacha.address)).to.be.equal(
        priceGacha2.mul(times)
      );
      expect(await gold.balanceOf(accountA.address)).to.be.equal(
        defaultBalance.sub(priceGacha2.mul(times))
      );
    });

    it("should open gacha correctly gacha3", async () => {
      var times = 3;
      for (var i = 1; i <= times; i++) {
        await pettyGacha.openGacha(3, priceGacha3);
        const petty = await pettyGacha._tokenIdToPetty(i);
        console.log(petty);
        expect(await pettyGacha.ownerOf(i)).to.be.equal(accountA.address);
      }
      expect(await gold.balanceOf(pettyGacha.address)).to.be.equal(
        priceGacha3.mul(times)
      );
      expect(await gold.balanceOf(accountA.address)).to.be.equal(
        defaultBalance.sub(priceGacha3.mul(times))
      );
    });
  });

  describe("breedPetty", () => {
    it("should revert if not owner", async () => {
      
    })
    it("should revert if not same rank", async () => {
      
    })
    it("should revert if petty is at the highest rank", async () => {
      
    })
    it("should revert if nft hasn't been approved", async () => {
      
    })
    it("should breed correctly", async () => {
      
    })
  })
});
