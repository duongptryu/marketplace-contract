const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Petty NFT", function () {
  let [accountA, accountB, accountC] = [];
  let pettyGacha;
  let gold;
  let address0 = "0x0000000000000000000000000000000000000000";
  let defaultBalance = ethers.utils.parseEther("1000000000");
  let priceGacha1 = ethers.utils.parseEther("100");
  let priceGacha2 = ethers.utils.parseEther("200");
  let priceGacha3 = ethers.utils.parseEther("300");
  let oneDay = 86400;

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
      await pettyGacha.openGacha(4, priceGacha1);
      await pettyGacha.openGacha(4, priceGacha1);
      await expect(
        pettyGacha.connect(accountB).breedPetties(1, 2)
      ).to.be.revertedWith("PettyGacha: sender is not owner of token");
    });
    it("should revert if not same rank", async () => {
      await pettyGacha.openGacha(4, priceGacha1);
      await pettyGacha.openGacha(5, priceGacha2);
      await pettyGacha.setApprovalForAll(pettyGacha.address, true);
      await expect(pettyGacha.breedPetties(1, 2)).to.be.revertedWith(
        "PettyGacha: petty must be same rank"
      );
    });
    it("should revert if petty is at the highest rank", async () => {
      await pettyGacha.openGacha(6, priceGacha3);
      await pettyGacha.openGacha(6, priceGacha3);
      await pettyGacha.setApprovalForAll(pettyGacha.address, true);
      await expect(pettyGacha.breedPetties(1, 2)).to.be.revertedWith(
        "PettyGacha: petties is at the highest rank"
      );
    });
    it("should revert if nft hasn't been approved", async () => {
      await pettyGacha.openGacha(6, priceGacha3);
      await pettyGacha.openGacha(6, priceGacha3);
      await expect(pettyGacha.breedPetties(1, 2)).to.be.revertedWith(
        "PettyGacha: The contract is unauthorized to manage this token"
      );
    });
    it("should breed correctly", async () => {
      await pettyGacha.openGacha(5, priceGacha2); //rank 2
      await pettyGacha.openGacha(5, priceGacha2); // rank 2
      await pettyGacha.setApprovalForAll(pettyGacha.address, true);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);

      const idBreed = await pettyGacha.breedPetties(1, 2);
      const breedInfo = await pettyGacha._idToBreedPetty(1);
      expect(breedInfo.owner).to.be.equal(accountA.address);
      expect(breedInfo.startTime).to.be.equal((await block.timestamp) + 1);
      expect(breedInfo.breedTime).to.be.equal(oneDay * 3);
      expect(breedInfo.tokenId1).to.be.equal(1);
      expect(breedInfo.tokenId2).to.be.equal(2);
      expect(breedInfo.rank).to.be.equal(3);
    });
  });

  describe("claimToken", () => {
    beforeEach(async () => {
      await pettyGacha.openGacha(5, priceGacha2); //rank 2
      await pettyGacha.openGacha(5, priceGacha2); // rank 2
      await pettyGacha.setApprovalForAll(pettyGacha.address, true);
      await pettyGacha.breedPetties(1, 2);
    });

    it("should revert if not owner", async () => {
      await expect(
        pettyGacha.connect(accountB).claimPetty(1)
      ).to.be.revertedWith("PettyGacha: Unauthorization");
    });
    it("should revert if not exceed claim time", async () => {
      await expect(pettyGacha.claimPetty(1)).to.be.revertedWith(
        "PettyGacha: breed time hasn't been exceeded"
      );
    });
    it("should claim correctly", async () => {
      network.provider.send("evm_increaseTime", [oneDay * 3 + 2]);
      await pettyGacha.claimPetty(1);

      const breedInfo = await pettyGacha._idToBreedPetty(1);
      expect(breedInfo.owner).to.be.equal(address0);
      expect(breedInfo.startTime).to.be.equal(0);
      expect(breedInfo.breedTime).to.be.equal(0);
      expect(breedInfo.tokenId1).to.be.equal(0);
      expect(breedInfo.tokenId2).to.be.equal(0);
      expect(breedInfo.rank).to.be.equal(0);

      const newPetty = await pettyGacha._tokenIdToPetty(3);
      expect(newPetty.rank).to.be.equal(3);
      expect(await pettyGacha.ownerOf(3)).to.be.equal(accountA.address);
    });
  });
});
