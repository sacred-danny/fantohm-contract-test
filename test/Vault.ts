import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployVaultFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await ethers.getSigners();

    const BalanceToken = await ethers.getContractFactory("BalanceToken");
    const balanceToken = await BalanceToken.deploy();

    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(balanceToken.address);

    await balanceToken.mint(account1.address, 100);
    await balanceToken.mint(account2.address, 200);
    await balanceToken.mint(account3.address, 300);

    await balanceToken.connect(account1).approve(vault.address, 100);
    await balanceToken.connect(account2).approve(vault.address, 200);
    await balanceToken.connect(account3).approve(vault.address, 300);

    return { vault, balanceToken, owner, account1, account2, account3 };
  }

  describe("Should deposit", function () {
    it("Should deposit", async function () {
      const { vault, balanceToken, account1, account2, account3 } =
        await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(10);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(10);
      expect(await balanceToken.balanceOf(account1.address)).to.equal(90);

      await vault.connect(account2).deposit(20);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(30);
      expect(await balanceToken.balanceOf(account2.address)).to.equal(180);

      await vault.connect(account3).deposit(30);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(60);
      expect(await balanceToken.balanceOf(account3.address)).to.equal(270);
    });
  });
  describe("Should withdraw", function () {
    it("Should revert if I never deposit", async function () {
      const { vault, account1, account2 } = await loadFixture(
        deployVaultFixture
      );
      await vault.connect(account1).deposit(10);
      await expect(vault.connect(account2).withdraw(10)).to.be.revertedWith(
        "user doesn't exist"
      );
    });
    it("Should revert if I don't have enough balance", async function () {
      const { vault, account1 } = await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(10);
      await expect(vault.connect(account1).withdraw(20)).to.be.revertedWith(
        "Withdrawal amount too big"
      );
    });
    it("Should withdraw", async function () {
      const { vault, balanceToken, account1, account2, account3 } =
        await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(10);
      await vault.connect(account2).deposit(20);
      await vault.connect(account3).deposit(30);

      await vault.connect(account1).withdraw(1);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(59);
      expect(await balanceToken.balanceOf(account1.address)).to.equal(91);

      await vault.connect(account2).withdraw(2);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(57);
      expect(await balanceToken.balanceOf(account2.address)).to.equal(182);

      await vault.connect(account3).withdraw(3);
      expect(await balanceToken.balanceOf(vault.address)).to.equal(54);
      expect(await balanceToken.balanceOf(account3.address)).to.equal(273);
    });
  });

  describe("Top2 function should work correctly", function () {
    it("Should revert if there are less than two depositors", async function () {
      const { vault, account1 } = await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(20);
      await expect(vault.top2()).to.be.revertedWith("Less than two depositors");
    });
    it("Should return top 2 depositors: case 1", async function () {
      const { vault, balanceToken, owner, account1, account2, account3 } =
        await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(10);
      await vault.connect(account2).deposit(20);
      await vault.connect(account3).deposit(30);
      const [richest, secondRichest] = await vault.top2();
      expect(richest).to.equal(account3.address);
      expect(secondRichest).to.equal(account2.address);
    });

    it("Should return top 2 depositors: case 2", async function () {
      const { vault, balanceToken, owner, account1, account2, account3 } =
        await loadFixture(deployVaultFixture);
      await vault.connect(account1).deposit(10);
      await vault.connect(account2).deposit(20);
      await vault.connect(account2).withdraw(18);
      await vault.connect(account3).deposit(30);
      await vault.connect(account3).withdraw(25);

      const id1 = await vault.id(account1.address);
      const id2 = await vault.id(account2.address);
      const id3 = await vault.id(account3.address);

      expect((await vault.funder(id1)).amount).to.equal(10);
      expect((await vault.funder(id2)).amount).to.equal(2);
      expect((await vault.funder(id3)).amount).to.equal(5);

      const [richest, secondRichest] = await vault.top2();
      expect(richest).to.equal(account1.address);
      expect(secondRichest).to.equal(account3.address);
    });
  });
});
