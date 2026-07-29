// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VaultManager
 * @notice Manages the bank interest pool, fee destination, emergency pause, and solvency checks for fixed savings deposits.
 * @dev Holds interest funds exclusively. Interacts with `SavingCore` to allocate, cancel, and pay interest while maintaining Solvency Guard (C2).
 */
contract VaultManager is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // =========================================================================
    // STORAGE & INVARIANTS
    // =========================================================================

    /// @notice Address of the USDC token contract.
    IERC20 public immutable usdcToken;

    /// @notice Address receiving early withdrawal penalty fees.
    address public feeReceiver;

    /// @notice Address of the authorized SavingCore contract.
    address public savingCore;

    /**
     * @notice Solvency Guard (C2): Total promised interest committed to all currently active deposits.
     * @dev Prevents admin from withdrawing funds required to honor active deposit interest.
     */
    uint256 public totalPromisedInterest;

    // =========================================================================
    // EVENTS
    // =========================================================================

    /// @notice Emitted when the vault is funded with USDC interest reserves.
    /// @param actor Address funding the vault.
    /// @param amount Amount of USDC added.
    /// @param timestamp Block timestamp of the event.
    event VaultFunded(address indexed actor, uint256 amount, uint256 timestamp);

    /// @notice Emitted when the owner withdraws unallocated funds from the vault.
    /// @param actor Address performing the withdrawal.
    /// @param amount Amount of USDC withdrawn.
    /// @param timestamp Block timestamp of the event.
    event VaultWithdrawn(address indexed actor, uint256 amount, uint256 timestamp);

    /// @notice Emitted when the fee receiver address is updated.
    /// @param actor Address updating the fee receiver.
    /// @param previousFeeReceiver Previous fee receiver address.
    /// @param newFeeReceiver New fee receiver address.
    /// @param timestamp Block timestamp of the event.
    event FeeReceiverSet(
        address indexed actor,
        address indexed previousFeeReceiver,
        address indexed newFeeReceiver,
        uint256 timestamp
    );

    /// @notice Emitted when the SavingCore contract address is set.
    /// @param actor Address configuring SavingCore.
    /// @param previousSavingCore Previous SavingCore contract address.
    /// @param newSavingCore New SavingCore contract address.
    /// @param timestamp Block timestamp of the event.
    event SavingCoreSet(
        address indexed actor,
        address indexed previousSavingCore,
        address indexed newSavingCore,
        uint256 timestamp
    );

    /// @notice Emitted when the system is paused by owner.
    /// @param actor Address invoking pause.
    /// @param timestamp Block timestamp of the event.
    event SystemPaused(address indexed actor, uint256 timestamp);

    /// @notice Emitted when the system is unpaused by owner.
    /// @param actor Address invoking unpause.
    /// @param timestamp Block timestamp of the event.
    event SystemUnpaused(address indexed actor, uint256 timestamp);

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    /// @dev Restricts execution to the authorized SavingCore contract.
    modifier onlySavingCore() {
        require(msg.sender == savingCore, "VaultManager: only SavingCore");
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @notice Initializes the VaultManager contract.
     * @param _usdcToken Address of the underlying USDC token.
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "VaultManager: invalid token");
        usdcToken = IERC20(_usdcToken);
        feeReceiver = msg.sender;
    }

    // =========================================================================
    // ADMIN & CONFIGURATION
    // =========================================================================

    /**
     * @notice Sets the destination address for penalty fees collected during early withdrawals.
     * @param _feeReceiver New fee receiver address.
     */
    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0), "VaultManager: invalid address");
        address previousFeeReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverSet(msg.sender, previousFeeReceiver, _feeReceiver, block.timestamp);
    }

    /**
     * @notice Sets the authorized SavingCore contract address.
     * @param _savingCore New SavingCore contract address.
     */
    function setSavingCore(address _savingCore) external onlyOwner {
        require(_savingCore != address(0), "VaultManager: invalid address");
        address previousSavingCore = savingCore;
        savingCore = _savingCore;
        emit SavingCoreSet(msg.sender, previousSavingCore, _savingCore, block.timestamp);
    }

    /**
     * @notice Pauses system deposit, withdrawal, and renewal operations.
     */
    function pause() external onlyOwner {
        _pause();
        emit SystemPaused(msg.sender, block.timestamp);
    }

    /**
     * @notice Unpauses system deposit, withdrawal, and renewal operations.
     */
    function unpause() external onlyOwner {
        _unpause();
        emit SystemUnpaused(msg.sender, block.timestamp);
    }

    // =========================================================================
    // VAULT FUNDING & WITHDRAWAL
    // =========================================================================

    /**
     * @notice Funds the vault interest pool with USDC.
     * @param amount Amount of USDC to fund (6 decimals).
     */
    function fundVault(uint256 amount) external onlyOwner whenNotPaused {
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit VaultFunded(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Withdraws surplus USDC from the vault while respecting Solvency Guard (C2).
     * @dev Reverts if `balance - amount < totalPromisedInterest`.
     * @param amount Amount of USDC to withdraw.
     */
    function withdrawVault(uint256 amount) external onlyOwner whenNotPaused {
        uint256 currentBalance = usdcToken.balanceOf(address(this));
        require(currentBalance >= amount, "VaultManager: insufficient balance");
        require(
            currentBalance - amount >= totalPromisedInterest,
            "VaultManager: cannot withdraw promised interest"
        );
        usdcToken.safeTransfer(msg.sender, amount);
        emit VaultWithdrawn(msg.sender, amount, block.timestamp);
    }

    // =========================================================================
    // SAVINGCORE ACCOUNTING INTERFACES
    // =========================================================================

    /**
     * @notice Allocates promised interest for a newly opened or renewed deposit.
     * @dev Called exclusively by SavingCore. Increases `totalPromisedInterest`.
     * @param amount Expected interest amount.
     */
    function allocateInterest(uint256 amount) external onlySavingCore {
        totalPromisedInterest += amount;
    }

    /**
     * @notice Cancels allocated promised interest upon early withdrawal of a deposit.
     * @dev Called exclusively by SavingCore. Decreases `totalPromisedInterest`.
     * @param amount Interest amount to cancel.
     */
    function cancelInterest(uint256 amount) external onlySavingCore {
        require(totalPromisedInterest >= amount, "VaultManager: underflow");
        totalPromisedInterest -= amount;
    }

    /**
     * @notice Transfers accrued interest payout to a user or SavingCore.
     * @dev Called exclusively by SavingCore. Reduces `totalPromisedInterest` and transfers tokens.
     * @param receiver Recipient address receiving interest tokens.
     * @param amount Interest payout amount.
     */
    function payInterest(address receiver, uint256 amount) external onlySavingCore whenNotPaused {
        require(usdcToken.balanceOf(address(this)) >= amount, "VaultManager: insufficient vault balance");
        require(totalPromisedInterest >= amount, "VaultManager: interest tracking error");
        totalPromisedInterest -= amount;
        usdcToken.safeTransfer(receiver, amount);
    }
}
