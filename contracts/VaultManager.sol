// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract VaultManager is Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdcToken;
    address public feeReceiver;
    address public savingCore;

    // Solvency Guard (C2): Tracks total promised interest committed to active deposits
    uint256 public totalPromisedInterest;

    event VaultFunded(address indexed actor, uint256 amount, uint256 timestamp);
    event VaultWithdrawn(address indexed actor, uint256 amount, uint256 timestamp);
    event FeeReceiverSet(
        address indexed actor,
        address indexed previousFeeReceiver,
        address indexed newFeeReceiver,
        uint256 timestamp
    );
    event SavingCoreSet(
        address indexed actor,
        address indexed previousSavingCore,
        address indexed newSavingCore,
        uint256 timestamp
    );
    event SystemPaused(address indexed actor, uint256 timestamp);
    event SystemUnpaused(address indexed actor, uint256 timestamp);

    modifier onlySavingCore() {
        require(msg.sender == savingCore, "VaultManager: only SavingCore");
        _;
    }

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "VaultManager: invalid token");
        usdcToken = IERC20(_usdcToken);
        feeReceiver = msg.sender;
    }

    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        require(_feeReceiver != address(0), "VaultManager: invalid address");
        address previousFeeReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverSet(msg.sender, previousFeeReceiver, _feeReceiver, block.timestamp);
    }

    function setSavingCore(address _savingCore) external onlyOwner {
        require(_savingCore != address(0), "VaultManager: invalid address");
        address previousSavingCore = savingCore;
        savingCore = _savingCore;
        emit SavingCoreSet(msg.sender, previousSavingCore, _savingCore, block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
        emit SystemPaused(msg.sender, block.timestamp);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit SystemUnpaused(msg.sender, block.timestamp);
    }

    function fundVault(uint256 amount) external onlyOwner {
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit VaultFunded(msg.sender, amount, block.timestamp);
    }

    function withdrawVault(uint256 amount) external onlyOwner whenNotPaused{
        uint256 currentBalance = usdcToken.balanceOf(address(this));
        require(currentBalance >= amount, "VaultManager: insufficient balance");
        require(
            currentBalance - amount >= totalPromisedInterest,
            "VaultManager: cannot withdraw promised interest"
        );
        usdcToken.safeTransfer(msg.sender, amount);
        emit VaultWithdrawn(msg.sender, amount, block.timestamp);
    }

    function allocateInterest(uint256 amount) external onlySavingCore {
        totalPromisedInterest += amount;
    }

    function cancelInterest(uint256 amount) external onlySavingCore {
        require(totalPromisedInterest >= amount, "VaultManager: underflow");
        totalPromisedInterest -= amount;
    }

    function payInterest(address receiver, uint256 amount) external onlySavingCore whenNotPaused {
        require(usdcToken.balanceOf(address(this)) >= amount, "VaultManager: insufficient vault balance");
        require(totalPromisedInterest >= amount, "VaultManager: interest tracking error");
        totalPromisedInterest -= amount;
        usdcToken.safeTransfer(receiver, amount);
    }
}
