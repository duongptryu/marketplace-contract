const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("Staking", () => {
  let [account1, account2, account3] = [];
  let gold;
  let staking;
  let store;
  let oneDay = 86400;
  let oneMonth = 86400 * 30;

  beforeEach(async () => {
    [account1, account2, account3] = await ethers.getSigners();

    const Gold = await ethers.getContractFactory("Gold");
    gold = await Gold.deploy();
    await gold.deployed();
    // console.log("Contract gold was deployed at address: ", gold.address);

    const Store = await ethers.getContractFactory("Reserve");
    store = await Store.deploy(gold.address);
    await store.deployed();
    // console.log("Contract reserve was deployed at address: ", store.address);

    const transferTxn = await gold.transfer(
      store.address,
      ethers.utils.parseEther("10")
    );
    await transferTxn.wait();

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(gold.address, store.address);
    await staking.deployed();
    // console.log("Contract staking was deployed at address: ", staking.address);
  });

  describe("Add package", () => {
    it("should revert if not owner", async () => {
      await expect(
        staking.connect(account2).addPackage(oneMonth, 0, 0, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert if locktime < 30 days", async () => {
      await expect(staking.addPackage(oneDay, 0, 0, 0)).to.be.revertedWith(
        "Staking: lock time must be greater than 1 month"
      );
    });
    it("should revert if amount < 10 ether", async () => {
      await expect(
        staking.addPackage(oneMonth, 0, 0, ethers.utils.parseEther("9"))
      ).to.be.revertedWith("Staking: min staking is 10 ether");
    });

    it("should add package correctly", async () => {
      const tx = await staking.addPackage(
        oneMonth,
        3,
        0,
        ethers.utils.parseEther("10")
      );
      await expect(tx)
        .to.be.emit(staking, "AddedPackage")
        .withArgs(1, oneMonth, 3, 0, ethers.utils.parseEther("10"));

      const tx2 = await staking.addPackage(
        oneMonth * 6,
        6,
        0,
        ethers.utils.parseEther("12")
      );
      await expect(tx2)
        .to.be.emit(staking, "AddedPackage")
        .withArgs(2, oneMonth * 6, 6, 0, ethers.utils.parseEther("12"));

      package1 = await staking._stakingPackage(1);
      package2 = await staking._stakingPackage(2);
      expect(package1.lockTime).to.be.equal(oneMonth);
      expect(package1.feeDecimal).to.be.equal(0);
      expect(package1.feeRate).to.be.equal(3);
      expect(package1.minStaking).to.be.equal(ethers.utils.parseEther("10"));
      expect(package1.isOffline).to.be.equal(false);

      expect(package2.lockTime).to.be.equal(oneMonth * 6);
      expect(package2.feeDecimal).to.be.equal(0);
      expect(package2.feeRate).to.be.equal(6);
      expect(package2.minStaking).to.be.equal(ethers.utils.parseEther("12"));
      expect(package2.isOffline).to.be.equal(false);
    });
  });

  describe("Remove package", () => {
    beforeEach(async () => {
      const tx = await staking.addPackage(
        oneMonth,
        3,
        0,
        ethers.utils.parseEther("10")
      );
    });
    it("should revert if not owner", async () => {
      await expect(
        staking.connect(account2).removePackage(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should revert if package not exist", async () => {
      await expect(staking.removePackage(2)).to.be.revertedWith(
        "Stake: Package is not exist"
      );
    });
    it("should revert if package already delete", async () => {
      await staking.removePackage(1);
      await expect(staking.removePackage(1)).to.be.revertedWith(
        "Stake: Package is not exist"
      );
    });
    it("should remove package correctly", async () => {
      const tx = await staking.removePackage(1);
      await expect(tx).to.be.emit(staking, "RemovedPackage").withArgs(1);

      const package3 = await staking._stakingPackage(1);
      expect(package3.lockTime).to.be.equal(oneMonth);
      expect(package3.feeDecimal).to.be.equal(0);
      expect(package3.feeRate).to.be.equal(3);
      expect(package3.minStaking).to.be.equal(ethers.utils.parseEther("10"));
      expect(package3.isOffline).to.be.equal(true);
    });
  });

  describe("Stake", () => {
    beforeEach(async () => {
      await staking.addPackage(oneMonth, 3, 0, ethers.utils.parseEther("10"));
      await staking.addPackage(
        oneMonth * 6,
        20,
        0,
        ethers.utils.parseEther("20")
      );
      await staking.addPackage(
        oneMonth * 12,
        50,
        0,
        ethers.utils.parseEther("50")
      );
    });
    it("should revert if package not exist", async () => {});
    it("Should revert if not enought token", async () => {});
    it("should revert if amount token not approved yet", async () => {});
    it("should stake correctly", async () => {});
    it("should stake more correctly", async () => {});
  });

  describe("UnStake", () => {
    it("should revert if package not exist", async () => {});
    it("Should revert if stake not exist", async () => {});
    it("should revert if time lock is not exceed", async () => {});
    it("should UnStake correctly", async () => {});
  });

  describe("Calculate profit", () => {
    it("should revert if package not exist", async () => {});
    it("Should revert if stake not exist", async () => {});
    it("should calculate profit correctly", async () => {});
  });
});
