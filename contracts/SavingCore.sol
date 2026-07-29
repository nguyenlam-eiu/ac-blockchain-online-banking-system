// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VaultManager.sol";

/**
 * @title SavingCore
 * @notice Core contract for managing fixed savings plans, issuing ERC721 deposit certificates, handling principal safety, and executing renewals/withdrawals.
 * @dev Holds user principal directly. Leverages VaultManager for interest distribution and solvency tracking.
 */
contract SavingCore is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================================
    // ENUMS & STRUCTS
    // =========================================================================

    /// @notice Status lifecycle of a deposit certificate.
    enum DepositStatus {
        Active,
        Withdrawn,
        ManualRenewed,
        AutoRenewed
    }

    /// @notice Configuration details for a savings plan.
    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    /// @notice Record representing an active or historic deposit certificate.
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

    // =========================================================================
    // STORAGE & CONSTANTS
    // =========================================================================

    /// @dev Denominator for basis points calculation (10,000 = 100%).
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @dev Number of seconds in 1 day.
    uint256 private constant SECONDS_PER_DAY = 1 days;

    /// @dev Number of seconds in 1 year (365 days).
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    /// @notice Grace period window after maturity for manual actions before auto-renewal eligibility.
    uint256 public constant GRACE_PERIOD = 3 days;

    /// @notice Immutable reference to the USDC token contract.
    IERC20 public immutable usdcToken;

    /// @notice Immutable reference to the VaultManager contract.
    VaultManager public immutable vaultManager;

    /// @notice Mapping from plan ID to savings plan configuration.
    mapping(uint256 => SavingPlan) public plans;

    /// @notice Counter for generating the next savings plan ID.
    uint256 public nextPlanId;

    /// @notice Mapping from deposit ID to deposit certificate data.
    mapping(uint256 => DepositCertificate) public deposits;

    /// @notice Counter for generating the next deposit ID.
    uint256 public nextDepositId;

    /**
     * @notice C1 — Principal Safety: Deferred unpaid interest owed to users when VaultManager is insolvent.
     * @dev Claimable later via `claimPendingInterest()` when the vault is refunded.
     */
    mapping(address => uint256) public pendingInterest;

    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when a new savings plan is created by owner.
    event PlanCreated(
        uint256 indexed planId,
        address indexed actor,
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 earlyWithdrawPenaltyBps,
        uint256 timestamp
    );

    /// @notice Emitted when an existing plan's APR is updated by owner.
    event PlanUpdated(
        uint256 indexed planId,
        address indexed actor,
        uint256 previousAprBps,
        uint256 newAprBps,
        uint256 timestamp
    );

    /// @notice Emitted when a plan is enabled or disabled.
    event PlanStatusChanged(
        uint256 indexed planId,
        address indexed actor,
        bool enabled,
        uint256 timestamp
    );

    /// @notice Emitted when a new deposit is opened and certificate NFT is minted.
    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 indexed planId,
        uint256 principal,
        uint256 maturityAt,
        uint256 aprBpsAtOpen
    );

    /// @notice Emitted when a deposit is withdrawn at maturity.
    event DepositWithdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interestPaid
    );

    /// @notice Emitted when vault insolvency prevents immediate interest payment at maturity.
    event InterestDeferred(
        uint256 indexed depositId,
        address indexed owner,
        uint256 amount
    );

    /// @notice Emitted when a deposit is withdrawn prior to maturity.
    event EarlyWithdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 userReceives,
        uint256 penaltyAmount
    );

    /// @notice Emitted when a user successfully claims deferred pending interest.
    event PendingInterestClaimed(address indexed user, uint256 amount);

    /// @notice Emitted when a deposit certificate is renewed (manual or auto).
    event DepositRenewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        address indexed owner,
        uint256 principal,
        uint256 expectedInterest,
        uint256 newPlanId,
        DepositStatus renewalType
    );

    /// @notice Generic event emitted on deposit withdrawal (matured or early).
    event Withdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interest,
        bool isEarly
    );

    /// @notice Generic event emitted on deposit renewal.
    event Renewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        uint256 newPrincipal,
        uint256 indexed newPlanId
    );

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Initializes the SavingCore contract and underlying ERC721 token.
     * @param _usdcToken Address of the USDC token.
     * @param _vaultManager Address of the VaultManager contract.
     */
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

    // =========================================================================
    // PLAN MANAGEMENT
    // =========================================================================

    /**
     * @notice Creates a new savings plan with specified terms.
     * @param tenorDays Duration of the plan in days.
     * @param aprBps Annual percentage rate in basis points (100 BPS = 1%).
     * @param minDeposit Minimum deposit amount in smallest USDC units (0 for no min).
     * @param maxDeposit Maximum deposit amount in smallest USDC units (0 for no max).
     * @param earlyWithdrawPenaltyBps Early withdrawal penalty in basis points.
     */
    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 earlyWithdrawPenaltyBps
    ) external onlyOwner {
        require(tenorDays > 0, "SavingCore: tenor days must be greater than 0");
        require(aprBps > 0, "SavingCore: APR must be greater than 0");
        require(aprBps <= BPS_DENOMINATOR, "SavingCore: APR cannot exceed 100%");
        require(
            earlyWithdrawPenaltyBps <= BPS_DENOMINATOR,
            "SavingCore: penalty cannot exceed 100%"
        );
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

        emit PlanCreated(
            planId,
            msg.sender,
            tenorDays,
            aprBps,
            minDeposit,
            maxDeposit,
            earlyWithdrawPenaltyBps,
            block.timestamp
        );

        nextPlanId++;
    }

    /**
     * @notice Updates the APR for future deposits on an existing savings plan.
     * @dev Does not retroactively alter existing active deposit certificates.
     * @param planId Target plan ID.
     * @param newAprBps New annual percentage rate in basis points.
     */
    function updatePlan(uint256 planId, uint256 newAprBps) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        require(newAprBps > 0, "SavingCore: APR must be greater than 0");
        require(newAprBps <= BPS_DENOMINATOR, "SavingCore: APR cannot exceed 100%");

        uint256 previousAprBps = plans[planId].aprBps;
        plans[planId].aprBps = newAprBps;

        emit PlanUpdated(planId, msg.sender, previousAprBps, newAprBps, block.timestamp);
    }

    /**
     * @notice Enables a disabled savings plan for new deposits.
     * @param planId Target plan ID.
     */
    function enablePlan(uint256 planId) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        plans[planId].enabled = true;
        emit PlanStatusChanged(planId, msg.sender, true, block.timestamp);
    }

    /**
     * @notice Disables a savings plan to prevent new deposits.
     * @param planId Target plan ID.
     */
    function disablePlan(uint256 planId) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "SavingCore: plan does not exist");
        plans[planId].enabled = false;
        emit PlanStatusChanged(planId, msg.sender, false, block.timestamp);
    }

    // =========================================================================
    // DEPOSIT MANAGEMENT
    // =========================================================================

    /**
     * @notice Opens a new savings deposit and mints an ERC721 certificate NFT to the depositor.
     * @dev Transfers principal to SavingCore and registers promised interest in VaultManager.
     * @param planId ID of the savings plan to open.
     * @param amount Deposit principal amount in smallest USDC units (6 decimals).
     */
    function openDeposit(uint256 planId, uint256 amount) external nonReentrant {
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

        uint256 tenorSeconds = plan.tenorDays * SECONDS_PER_DAY;
        uint256 maturityAt = block.timestamp + tenorSeconds;
        uint256 depositId = nextDepositId;

        uint256 expectedInterest = _calculateInterest(amount, plan.aprBps, tenorSeconds);

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

    // =========================================================================
    // WITHDRAWAL LOGIC
    // =========================================================================

    /**
     * @notice Withdraws a matured deposit certificate (principal + interest).
     * @dev C1 Principal Safety: Principal is returned from SavingCore regardless of vault solvency.
     *      If VaultManager cannot pay interest, unpaid interest is deferred to `pendingInterest`.
     * @param depositId ID of the matured deposit certificate.
     */
    function withdrawAtMaturity(uint256 depositId) external nonReentrant {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        DepositCertificate storage deposit = deposits[depositId];
        require(deposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp >= deposit.maturityAt, "SavingCore: not yet matured");
        require(
            block.timestamp <= deposit.maturityAt + GRACE_PERIOD,
            "SavingCore: withdrawal grace period expired"
        );

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
        emit Withdrawn(depositId, msg.sender, principal, interestPaid, false);
    }

    /**
     * @notice Early withdraws an active deposit prior to its maturity date.
     * @dev User receives principal minus early withdrawal penalty. Penalty is transferred to `feeReceiver`.
     * @param depositId ID of the active deposit certificate.
     */
    function earlyWithdraw(uint256 depositId) external nonReentrant {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        DepositCertificate storage deposit = deposits[depositId];
        require(deposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp < deposit.maturityAt, "SavingCore: already matured");

        deposit.status = DepositStatus.Withdrawn;
        uint256 principal = deposit.principal;
        uint256 penaltyAmount = (principal * deposit.earlyWithdrawPenaltyBpsAtOpen) / BPS_DENOMINATOR;
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
        emit Withdrawn(depositId, msg.sender, principal, 0, true);
    }

    // =========================================================================
    // RENEWAL LOGIC
    // =========================================================================

    /**
     * @notice Manually renews a matured deposit into a new plan during the grace period.
     * @param depositId ID of the matured deposit certificate.
     * @param newPlanId Target plan ID for the renewed deposit.
     */
    function renewDeposit(uint256 depositId, uint256 newPlanId) external nonReentrant {
        require(ownerOf(depositId) == msg.sender, "SavingCore: not deposit owner");
        require(newPlanId > 0 && newPlanId < nextPlanId, "SavingCore: target plan does not exist");
        require(plans[newPlanId].enabled, "SavingCore: target plan is disabled");

        _renewDeposit(depositId, msg.sender, DepositStatus.ManualRenewed, newPlanId);
    }

    /**
     * @notice Auto-renews a matured deposit after the grace period has expired.
     * @dev Can be called by anyone; mints the new certificate NFT to the current certificate owner.
     * @param depositId ID of the matured deposit certificate.
     */
    function autoRenewDeposit(uint256 depositId) external nonReentrant {
        address depositOwner = ownerOf(depositId);
        _renewDeposit(depositId, depositOwner, DepositStatus.AutoRenewed, deposits[depositId].planId);
    }

    // =========================================================================
    // PENDING INTEREST LOGIC
    // =========================================================================

    /**
     * @notice Claims deferred interest that was previously accumulated due to vault insolvency.
     */
    function claimPendingInterest() external nonReentrant {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        uint256 amount = pendingInterest[msg.sender];
        require(amount > 0, "SavingCore: no pending interest");

        pendingInterest[msg.sender] = 0;
        vaultManager.payInterest(msg.sender, amount);

        emit PendingInterestClaimed(msg.sender, amount);
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /**
     * @dev Internal pure helper to calculate expected interest.
     * @param principal Principal amount in smallest units.
     * @param aprBps Annual percentage rate in basis points.
     * @param tenorSeconds Tenor duration in seconds.
     * @return Expected interest in smallest units.
     */
    function _calculateInterest(
        uint256 principal,
        uint256 aprBps,
        uint256 tenorSeconds
    ) internal pure returns (uint256) {
        return (principal * aprBps * tenorSeconds) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }

    /**
     * @dev Internal function to process manual or auto renewals of deposit certificates.
     * @param depositId ID of the existing deposit certificate.
     * @param depositOwner Owner receiving the newly minted deposit certificate NFT.
     * @param renewalType Type of renewal (`ManualRenewed` or `AutoRenewed`).
     * @param targetPlanId Target plan ID for manual renewal (ignored for auto renewal).
     */
    function _renewDeposit(
        uint256 depositId,
        address depositOwner,
        DepositStatus renewalType,
        uint256 targetPlanId
    ) internal {
        require(!vaultManager.paused(), "SavingCore: system is paused");
        DepositCertificate storage oldDeposit = deposits[depositId];
        require(oldDeposit.status == DepositStatus.Active, "SavingCore: deposit not active");
        require(block.timestamp >= oldDeposit.maturityAt, "SavingCore: not yet matured");

        if (renewalType == DepositStatus.AutoRenewed) {
            require(block.timestamp >= oldDeposit.maturityAt + GRACE_PERIOD, "SavingCore: grace period not ended");
        } else {
            require(
                block.timestamp <= oldDeposit.maturityAt + GRACE_PERIOD,
                "SavingCore: manual renewal grace period expired"
            );
        }

        uint256 interest = oldDeposit.expectedInterest;
        uint256 newPrincipal = oldDeposit.principal + interest;

        uint256 newTenorSeconds;
        uint256 newAprBps;
        uint256 newPenaltyBps;
        uint256 newPlanId;

        if (renewalType == DepositStatus.ManualRenewed) {
            SavingPlan memory targetPlan = plans[targetPlanId];

            newPlanId = targetPlanId;
            newTenorSeconds = targetPlan.tenorDays * SECONDS_PER_DAY;
            newAprBps = targetPlan.aprBps;
            newPenaltyBps = targetPlan.earlyWithdrawPenaltyBps;
        } else {
            newPlanId = oldDeposit.planId;
            newTenorSeconds = oldDeposit.maturityAt - oldDeposit.startAt;
            newAprBps = oldDeposit.aprBpsAtOpen;
            newPenaltyBps = oldDeposit.earlyWithdrawPenaltyBpsAtOpen;
        }

        uint256 newExpectedInterest = _calculateInterest(newPrincipal, newAprBps, newTenorSeconds);

        uint256 newDepositId = nextDepositId;

        oldDeposit.status = renewalType;

        vaultManager.payInterest(address(this), interest);

        deposits[newDepositId] = DepositCertificate({
            planId: newPlanId,
            principal: newPrincipal,
            startAt: block.timestamp,
            maturityAt: block.timestamp + newTenorSeconds,
            aprBpsAtOpen: newAprBps,
            earlyWithdrawPenaltyBpsAtOpen: newPenaltyBps,
            expectedInterest: newExpectedInterest,
            status: DepositStatus.Active
        });

        vaultManager.allocateInterest(newExpectedInterest);

        _mint(depositOwner, newDepositId);

        emit DepositRenewed(
            depositId,
            newDepositId,
            depositOwner,
            newPrincipal,
            newExpectedInterest,
            newPlanId,
            renewalType
        );

        emit Renewed(depositId, newDepositId, newPrincipal, newPlanId);

        nextDepositId++;
    }
}
