const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe.only("Staking", () => {
  let [account1, account2, account3] = [];
  let gold;
  let staking;
  let store;
  let oneDay = 86400;
  let oneMonth = 86400 * 30;
  let defaultPrice = ethers.utils.parseEther("100000");

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

    const transferTxn = await gold.transfer(store.address, defaultPrice);
    await transferTxn.wait();

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(gold.address, store.address);
    await staking.deployed();
    // console.log("Contract staking was deployed at address: ", staking.address);

    await store.transferOwnership(staking.address);
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
    it("should revert if package not exist", async () => {
      await expect(staking.stake(4, 1)).to.be.revertedWith(
        "Stake: Package is not exist"
      );
    });
    it("Should revert if not enought token", async () => {
      await expect(staking.stake(1, 1)).to.be.revertedWith(
        "Stake: Not enought min stake require"
      );
    });
    it("should revert if amount token not approved yet", async () => {
      await expect(
        staking.stake(1, ethers.utils.parseEther("20"))
      ).to.be.revertedWith("Stake: Not enought token approve");
    });
    it("should stake correctly", async () => {
      const balance = await gold.balanceOf(account1.address);
      await gold.approve(staking.address, ethers.utils.parseEther("20"));
      const tx = await staking.stake(1, ethers.utils.parseEther("20"));

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);

      await expect(tx)
        .to.be.emit(staking, "Staked")
        .withArgs(
          account1.address,
          block.timestamp,
          block.timestamp,
          ethers.utils.parseEther("20"),
          1
        );

      const staked = await staking._stakingInfo(account1.address, 1);
      expect(staked.account).to.be.equal(account1.address);
      expect(staked.startTime).to.be.equal(block.timestamp);
      expect(staked.timePoint).to.be.equal(block.timestamp);
      expect(staked.amount).to.be.equal(ethers.utils.parseEther("20"));
      expect(staked.totalProfit).to.be.equal(0);
      expect(await gold.balanceOf(account1.address)).to.be.equal(
        ethers.BigNumber.from(balance).sub(ethers.utils.parseEther("20"))
      );
    });
    it("should stake more correctly", async () => {
      const balance = await gold.balanceOf(account1.address);
      //stake 1
      await gold.approve(staking.address, ethers.utils.parseEther("20"));
      const tx = await staking.stake(1, ethers.utils.parseEther("20"));

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);

      await expect(tx)
        .to.be.emit(staking, "Staked")
        .withArgs(
          account1.address,
          block.timestamp,
          block.timestamp,
          ethers.utils.parseEther("20"),
          1
        );

      const staked = await staking._stakingInfo(account1.address, 1);
      expect(staked.account).to.be.equal(account1.address);
      expect(staked.startTime).to.be.equal(block.timestamp);
      expect(staked.timePoint).to.be.equal(block.timestamp);
      expect(staked.amount).to.be.equal(ethers.utils.parseEther("20"));
      expect(staked.totalProfit).to.be.equal(0);
      expect(await gold.balanceOf(account1.address)).to.be.equal(
        ethers.BigNumber.from(balance).sub(ethers.utils.parseEther("20"))
      );

      //increase time
      await network.provider.send("evm_increaseTime", [oneMonth * 6]);

      //stake 2
      await gold.approve(staking.address, ethers.utils.parseEther("30"));
      const tx2 = await staking.stake(1, ethers.utils.parseEther("30"));

      const blockNum1 = await ethers.provider.getBlockNumber();
      const block1 = await ethers.provider.getBlock(blockNum1);

      await expect(tx2)
        .to.be.emit(staking, "StakedUpdate")
        .withArgs(
          account1.address,
          1,
          block1.timestamp,
          ethers.utils.parseEther("50"),
          ethers.BigNumber.from("3600000231481481481")
        );

      const staked1 = await staking._stakingInfo(account1.address, 1);
      expect(staked1.account).to.be.equal(account1.address);
      expect(staked1.startTime).to.be.equal(block.timestamp);
      expect(staked1.timePoint).to.be.equal(block1.timestamp);
      expect(staked1.amount).to.be.equal(ethers.utils.parseEther("50"));
      expect(staked1.totalProfit).to.be.equal(
        ethers.BigNumber.from("3600000231481481481")
      );
      expect(await gold.balanceOf(account1.address)).to.be.equal(
        ethers.BigNumber.from(balance).sub(ethers.utils.parseEther("50"))
      );
    });
  });

  describe("UnStake", () => {
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

      await gold.approve(staking.address, ethers.utils.parseEther("20"));
      await staking.stake(1, ethers.utils.parseEther("20"));
    });
    it("should revert if package not exist", async () => {
      await expect(staking.unStake(4)).to.be.revertedWith(
        "Stake: Package is not exist"
      );
    });
    it("Should revert if stake not exist", async () => {
      await expect(staking.connect(account2).unStake(1)).to.be.revertedWith(
        "Stake: Stake does not exist"
      );
    });
    it("should revert if time lock is not exceed", async () => {
      await expect(staking.unStake(1)).to.be.revertedWith(
        "Stake: time lock is not exceed"
      );
    });
    it("should UnStake correctly", async () => {
      const staked = await staking._stakingInfo(account1.address, 1);
      const balance = await gold.balanceOf(account1.address);

      await network.provider.send("evm_increaseTime", [oneMonth * 24]);
      const tx = await staking.unStake(1);

      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);

      await expect(tx)
        .to.be.emit(staking, "UnStaked")
        .withArgs(
          account1.address,
          1,
          staked.startTime,
          block.timestamp,
          staked.amount,
          "14400000000000000000"
        );

      expect(await gold.balanceOf(account1.address)).to.be.equal(
        ethers.BigNumber.from(balance).add("14400000000000000000")
      );
    });
  });

  describe("Calculate profit", () => {
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

      await gold.approve(staking.address, ethers.utils.parseEther("20"));
      await staking.stake(1, ethers.utils.parseEther("20"));
    });
    it("should revert if package not exist", async () => {
      await expect(staking.unStake(4)).to.be.revertedWith(
        "Stake: Package is not exist"
      );
    });
    it("Should revert if stake not exist", async () => {
      await expect(staking.connect(account2).unStake(1)).to.be.revertedWith(
        "Stake: Stake does not exist"
      );
    });
    it("should calculate profit correctly", async () => {
      
    });
  });
});
