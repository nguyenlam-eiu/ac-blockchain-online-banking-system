import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Principal Safety", function () {
  const ONE_DAY = 24 * 60 * 60;

  const PLAN_TENOR_DAYS = 1n;
  const APR_BPS = 225n;
  const MIN_DEPOSIT = ethers.parseUnits(
    "1",
    6
  );
  const MAX_DEPOSIT = ethers.parseUnits(
    "1000000",
    6
  );
  const PENALTY_BPS = 400n;

  const PRINCIPAL = ethers.parseUnits(
    "100",
    6
  );

  async function deployPrincipalSafetyFixture() {
    const [
      admin,
      user,
      attacker,
      newAdmin,
    ] = await ethers.getSigners();

    const MockUSDC =
      await ethers.getContractFactory(
        "MockUSDC"
      );

    const usdc = await MockUSDC.deploy(
      "Mock USDC",
      "mUSDC"
    );

    await usdc.waitForDeployment();

    const VaultManager =
      await ethers.getContractFactory(
        "VaultManager"
      );

    const vaultManager =
      await VaultManager.deploy(
        await usdc.getAddress()
      );

    await vaultManager.waitForDeployment();

    const SavingCore =
      await ethers.getContractFactory(
        "SavingCore"
      );

    const savingCore =
      await SavingCore.deploy(
        await usdc.getAddress(),
        await vaultManager.getAddress()
      );

    await savingCore.waitForDeployment();

    await vaultManager.setSavingCore(
      await savingCore.getAddress()
    );

    await savingCore.createPlan(
      PLAN_TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

    await usdc.mint(
      user.address,
      PRINCIPAL
    );

    await usdc
      .connect(user)
      .approve(
        await savingCore.getAddress(),
        PRINCIPAL
      );

    return {
      admin,
      user,
      attacker,
      newAdmin,
      usdc,
      vaultManager,
      savingCore,
    };
  }

  async function openDepositWithoutVaultFunding() {
    const fixture =
      await deployPrincipalSafetyFixture();

    const {
      user,
      savingCore,
    } = fixture;

    await savingCore
      .connect(user)
      .openDeposit(1n, PRINCIPAL);

    const deposit =
      await savingCore.deposits(1n);

    return {
      ...fixture,
      deposit,
    };
  }

  async function moveToMaturity(
    maturityAt: bigint
  ) {
    await time.increaseTo(
      maturityAt
    );
  }

  it(
    "keeps user principal inside SavingCore",
    async function () {
      const {
        user,
        usdc,
        savingCore,
        vaultManager,
      } =
        await openDepositWithoutVaultFunding();

      expect(
        await usdc.balanceOf(
          await savingCore.getAddress()
        )
      ).to.equal(PRINCIPAL);

      expect(
        await usdc.balanceOf(
          await vaultManager.getAddress()
        )
      ).to.equal(0n);

      expect(
        await usdc.balanceOf(
          user.address
        )
      ).to.equal(0n);
    }
  );

  it(
    "returns principal even when the vault cannot pay interest",
    async function () {
      const {
        user,
        usdc,
        savingCore,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      const userBalanceBefore =
        await usdc.balanceOf(
          user.address
        );

      await expect(
        savingCore
          .connect(user)
          .withdrawAtMaturity(1n)
      )
        .to.emit(
          savingCore,
          "InterestDeferred"
        )
        .withArgs(
          1n,
          user.address,
          deposit.expectedInterest
        );

      const userBalanceAfter =
        await usdc.balanceOf(
          user.address
        );

      expect(
        userBalanceAfter -
          userBalanceBefore
      ).to.equal(PRINCIPAL);

      expect(
        await savingCore.pendingInterest(
          user.address
        )
      ).to.equal(
        deposit.expectedInterest
      );
    }
  );

  it(
    "marks the old certificate as withdrawn after principal recovery",
    async function () {
      const {
        user,
        savingCore,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      await savingCore
        .connect(user)
        .withdrawAtMaturity(1n);

      const updatedDeposit =
        await savingCore.deposits(1n);

      expect(
        updatedDeposit.status
      ).to.equal(1n);
    }
  );

  it(
    "allows deferred interest to be claimed after the vault is funded",
    async function () {
      const {
        admin,
        user,
        usdc,
        savingCore,
        vaultManager,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      await savingCore
        .connect(user)
        .withdrawAtMaturity(1n);

      const pendingInterest =
        await savingCore.pendingInterest(
          user.address
        );

      expect(
        pendingInterest
      ).to.equal(
        deposit.expectedInterest
      );

      await usdc.mint(
        admin.address,
        pendingInterest
      );

      await usdc
        .connect(admin)
        .approve(
          await vaultManager.getAddress(),
          pendingInterest
        );

      await vaultManager
        .connect(admin)
        .fundVault(
          pendingInterest
        );

      const userBalanceBefore =
        await usdc.balanceOf(
          user.address
        );

      await expect(
        savingCore
          .connect(user)
          .claimPendingInterest()
      )
        .to.emit(
          savingCore,
          "PendingInterestClaimed"
        )
        .withArgs(
          user.address,
          pendingInterest
        );

      const userBalanceAfter =
        await usdc.balanceOf(
          user.address
        );

      expect(
        userBalanceAfter -
          userBalanceBefore
      ).to.equal(
        pendingInterest
      );

      expect(
        await savingCore.pendingInterest(
          user.address
        )
      ).to.equal(0n);
    }
  );

  it(
    "prevents the admin from withdrawing user principal",
    async function () {
      const {
        admin,
        user,
        usdc,
        savingCore,
        vaultManager,
      } =
        await openDepositWithoutVaultFunding();

      const coreBalanceBefore =
        await usdc.balanceOf(
          await savingCore.getAddress()
        );

      expect(
        coreBalanceBefore
      ).to.equal(PRINCIPAL);

      await expect(
        vaultManager
          .connect(admin)
          .withdrawVault(1n)
      ).to.be.reverted;

      expect(
        await usdc.balanceOf(
          await savingCore.getAddress()
        )
      ).to.equal(PRINCIPAL);

      expect(
        await usdc.balanceOf(
          user.address
        )
      ).to.equal(0n);
    }
  );

  it(
    "prevents a non-owner from withdrawing another user's principal",
    async function () {
      const {
        attacker,
        savingCore,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      await expect(
        savingCore
          .connect(attacker)
          .withdrawAtMaturity(1n)
      ).to.be.revertedWith(
        "SavingCore: not deposit owner"
      );
    }
  );

  it(
    "blocks mature withdrawal while the system is paused",
    async function () {
      const {
        admin,
        user,
        savingCore,
        vaultManager,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      await vaultManager
        .connect(admin)
        .pause();

      await expect(
        savingCore
          .connect(user)
          .withdrawAtMaturity(1n)
      ).to.be.revertedWith(
        "SavingCore: system is paused"
      );
    }
  );

  it(
    "allows principal withdrawal after the system is unpaused",
    async function () {
      const {
        admin,
        user,
        usdc,
        savingCore,
        vaultManager,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await moveToMaturity(
        deposit.maturityAt
      );

      await vaultManager
        .connect(admin)
        .pause();

      await vaultManager
        .connect(admin)
        .unpause();

      await savingCore
        .connect(user)
        .withdrawAtMaturity(1n);

      expect(
        await usdc.balanceOf(
          user.address
        )
      ).to.equal(PRINCIPAL);

      expect(
        await savingCore.pendingInterest(
          user.address
        )
      ).to.equal(
        deposit.expectedInterest
      );
    }
  );

  it(
    "still lets the user recover principal after SavingCore ownership is transferred",
    async function () {
      const {
        admin,
        user,
        newAdmin,
        usdc,
        savingCore,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await savingCore
        .connect(admin)
        .transferOwnership(
          newAdmin.address
        );

      expect(
        await savingCore.owner()
      ).to.equal(
        newAdmin.address
      );

      await moveToMaturity(
        deposit.maturityAt
      );

      await savingCore
        .connect(user)
        .withdrawAtMaturity(1n);

      expect(
        await usdc.balanceOf(
          user.address
        )
      ).to.equal(PRINCIPAL);

      expect(
        await savingCore.pendingInterest(
          user.address
        )
      ).to.equal(
        deposit.expectedInterest
      );
    }
  );

  it(
    "still lets the user recover principal after the original admin renounces SavingCore ownership",
    async function () {
      const {
        admin,
        user,
        usdc,
        savingCore,
        deposit,
      } =
        await openDepositWithoutVaultFunding();

      await savingCore
        .connect(admin)
        .renounceOwnership();

      expect(
        await savingCore.owner()
      ).to.equal(
        ethers.ZeroAddress
      );

      await moveToMaturity(
        deposit.maturityAt
      );

      await savingCore
        .connect(user)
        .withdrawAtMaturity(1n);

      expect(
        await usdc.balanceOf(
          user.address
        )
      ).to.equal(PRINCIPAL);

      expect(
        await savingCore.pendingInterest(
          user.address
        )
      ).to.equal(
        deposit.expectedInterest
      );
    }
  );
});
