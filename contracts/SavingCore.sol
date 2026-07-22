// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./VaultManager.sol";

contract SavingCore is ERC721, Ownable {
    using SafeERC20 for IERC20;
    enum DepositStatus {
        Active,
        Withdrawn,
        ManualRenewed,
        AutoRenewed
    }

    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    struct DepositCertificate {
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint256 aprBpsAtOpen;
        uint256 earlyWithdrawPenaltyBpsAtOpen;
        uint256 expectedInterest;
        DepositStatus status;
    }

    IERC20 public immutable usdcToken;
    VaultManager public immutable vaultManager;

    mapping(uint256 => SavingPlan) public plans;
    uint256 public nextPlanId;

    mapping(uint256 => DepositCertificate) public deposits;
    uint256 public nextDepositId;

    uint256 public constant GRACE_PERIOD = 3 days;

    // C1 — Principal Safety: deferred interest when vault is insolvent
    mapping(address => uint256) public pendingInterest;

    constructor(
        address _usdcToken,
        address _vaultManager
    ) ERC721("Deposit Certificate", "DEPOSIT") Ownable(msg.sender) {
        require(_usdcToken != address(0), "SavingCore: invalid token");
        require(_vaultManager != address(0), "SavingCore: invalid vault");
        usdcToken = IERC20(_usdcToken);
        vaultManager = VaultManager(_vaultManager);
        nextPlanId = 1;
        nextDepositId = 1;
    }

    // ALL SAVING PLAN LOGICS.
    event PlanCreated(uint256 indexed planId, uint256 tenorDays, uint256 aprBps);

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 earlyWithdrawPenaltyBps
    ) external onlyOwner {
        require(tenorDays > 0, "SavingCore: tenor days must be greater than 0");
        require(aprBps > 0, "SavingCore: APR must be greater than 0");
        require(aprBps <= 10000, "SavingCore: APR cannot exceed 100%");
        require(earlyWithdrawPenaltyBps <= 10000, "SavingCore: penalty cannot exceed 100%");
        if (maxDeposit > 0) {
            require(maxDeposit >= minDeposit, "SavingCore: max deposit must be >= min deposit");
        }

        uint256 planId = nextPlanId;

        plans[planId] = SavingPlan({
            tenorDays: tenorDays,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: earlyWithdrawPenaltyBps,
            enabled: true
        });

        emit PlanCreated(planId, tenorDays, aprBps);

        nextPlanId++;
    }

    event PlanUpdated(uint256 indexed planId, uint256 newAprBps);

    function updatePlan(uint256 planId, uint256 newAprBps) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        require(newAprBps > 0, "SavingCore: APR must be greater than 0");
        require(newAprBps <= 10000, "SavingCore: APR cannot exceed 100%");

        plans[planId].aprBps = newAprBps;

        emit PlanUpdated(planId, newAprBps);
    }

    event PlanStatusChanged(uint256 indexed planId, bool enabled);

    function enablePlan(uint256 planId) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        plans[planId].enabled = true;
        emit PlanStatusChanged(planId, true);
    }

    function disablePlan(uint256 planId) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        plans[planId].enabled = false;
        emit PlanStatusChanged(planId, false);
    }

    // ALL DEPOSIT LOGICS.
    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 indexed planId,
        uint256 principal,
        uint256 maturityAt,
        uint256 aprBpsAtOpen
    );

    event DepositWithdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interestPaid
    );

    event InterestDeferred(
        uint256 indexed depositId,
        address indexed owner,
        uint256 amount
    );

    event EarlyWithdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 userReceives,
        uint256 penaltyAmount
    );

    event PendingInterestClaimed(address indexed user, uint256 amount);
    event DepositRenewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        address indexed owner,
        uint256 principal,
        uint256 expectedInterest,
        DepositStatus renewalType
    );

    function openDeposit(uint256 planId, uint256 amount) external {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        SavingPlan memory plan = plans[planId];
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        require(plan.enabled, "SavingCore: plan is disabled");
        if (plan.minDeposit > 0) {
            require(amount >= plan.minDeposit, "SavingCore: amount below minimum");
        }
        if (plan.maxDeposit > 0) {
            require(amount <= plan.maxDeposit, "SavingCore: amount above maximum");
        }

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 tenorSeconds = plan.tenorDays * 86400;
        uint256 maturityAt = block.timestamp + tenorSeconds;
        uint256 depositId = nextDepositId;

        // Interest calculation: (principal * aprBps * tenorSeconds) / (365 * 86400 * 10000)
        uint256 expectedInterest = (amount * plan.aprBps * tenorSeconds) / (365 * 86400 * 10000);

        deposits[depositId] = DepositCertificate({
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: maturityAt,
            aprBpsAtOpen: plan.aprBps,
            earlyWithdrawPenaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            expectedInterest: expectedInterest,
            status: DepositStatus.Active
        });

        // Solvency Guard (C2): Register promised interest in VaultManager
        vaultManager.allocateInterest(expectedInterest);

        _mint(msg.sender, depositId);

        emit DepositOpened(depositId, msg.sender, planId, amount, maturityAt, plan.aprBps);

        nextDepositId++;
    }

    // ALL WITHDRAWAL LOGICS.

    function withdrawAtMaturity(uint256 depositId) external {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        DepositCertificate storage deposit = deposits[depositId];
        require(deposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp >= deposit.maturityAt, "SavingCore: not yet matured");

        deposit.status = DepositStatus.Withdrawn;
        uint256 principal = deposit.principal;
        uint256 interest = deposit.expectedInterest;

        // Principal is always returned from SavingCore
        usdcToken.safeTransfer(msg.sender, principal);

        // C1 — Principal Safety: try to pay interest from VaultManager
        uint256 interestPaid = 0;
        try vaultManager.payInterest(msg.sender, interest) {
            interestPaid = interest;
        } catch {
            // Vault insolvent — defer interest for later claim
            pendingInterest[msg.sender] += interest;
            emit InterestDeferred(depositId, msg.sender, interest);
        }

        emit DepositWithdrawn(depositId, msg.sender, principal, interestPaid);
    }

    function earlyWithdraw(uint256 depositId) external {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        DepositCertificate storage deposit = deposits[depositId];
        require(deposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp < deposit.maturityAt, "SavingCore: already matured");

        deposit.status = DepositStatus.Withdrawn;
        uint256 principal = deposit.principal;
        uint256 penaltyAmount = (principal * deposit.earlyWithdrawPenaltyBpsAtOpen) / 10000;
        uint256 userReceives = principal - penaltyAmount;

        // Return remaining principal to user
        usdcToken.safeTransfer(msg.sender, userReceives);

        // Send penalty to feeReceiver
        if (penaltyAmount > 0) {
            usdcToken.safeTransfer(vaultManager.feeReceiver(), penaltyAmount);
        }

        // Release allocated interest from VaultManager (C2 bookkeeping)
        vaultManager.cancelInterest(deposit.expectedInterest);

        emit EarlyWithdrawn(depositId, msg.sender, userReceives, penaltyAmount);
    }

    function renewDeposit(uint256 depositId) external {
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        _renewDeposit(depositId, msg.sender, DepositStatus.ManualRenewed, false);
    }

    function autoRenewDeposit(uint256 depositId) external {
        address depositOwner = ownerOf(depositId);
        _renewDeposit(depositId, depositOwner, DepositStatus.AutoRenewed, true);
    }

    function claimPendingInterest() external {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        uint256 amount = pendingInterest[msg.sender];
        require(amount > 0, "SavingCore: no pending interest");

        pendingInterest[msg.sender] = 0;
        vaultManager.payInterest(msg.sender, amount);

        emit PendingInterestClaimed(msg.sender, amount);
    }

    function _renewDeposit(
        uint256 depositId,
        address depositOwner,
        DepositStatus renewalType,
        bool enforceGracePeriod
    ) internal {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        DepositCertificate storage oldDeposit = deposits[depositId];
        require(oldDeposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp >= oldDeposit.maturityAt, "SavingCore: not yet matured");
        if (enforceGracePeriod) {
            require(block.timestamp <= oldDeposit.maturityAt + GRACE_PERIOD, "SavingCore: grace period expired");
        }

        uint256 interest = oldDeposit.expectedInterest;
        uint256 newPrincipal = oldDeposit.principal + interest;
        uint256 tenorSeconds = oldDeposit.maturityAt - oldDeposit.startAt;
        uint256 newExpectedInterest = (newPrincipal * oldDeposit.aprBpsAtOpen * tenorSeconds) / (365 * 86400 * 10000);
        uint256 newDepositId = nextDepositId;

        oldDeposit.status = renewalType;

        vaultManager.payInterest(address(this), interest);

        deposits[newDepositId] = DepositCertificate({
            planId: oldDeposit.planId,
            principal: newPrincipal,
            startAt: block.timestamp,
            maturityAt: block.timestamp + tenorSeconds,
            aprBpsAtOpen: oldDeposit.aprBpsAtOpen,
            earlyWithdrawPenaltyBpsAtOpen: oldDeposit.earlyWithdrawPenaltyBpsAtOpen,
            expectedInterest: newExpectedInterest,
            status: DepositStatus.Active
        });

        vaultManager.allocateInterest(newExpectedInterest);

        _mint(depositOwner, newDepositId);

        emit DepositRenewed(depositId, newDepositId, depositOwner, newPrincipal, newExpectedInterest, renewalType);

        nextDepositId++;
    }
}
