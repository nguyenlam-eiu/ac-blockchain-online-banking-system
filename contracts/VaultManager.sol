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

    event VaultFunded(address indexed sender, uint256 amount);
    event VaultWithdrawn(address indexed owner, uint256 amount);
    event FeeReceiverSet(address indexed newFeeReceiver);
    event SavingCoreSet(address indexed newSavingCore);

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
        feeReceiver = _feeReceiver;
        emit FeeReceiverSet(_feeReceiver);
    }

    function setSavingCore(address _savingCore) external onlyOwner {
        require(_savingCore != address(0), "VaultManager: invalid address");
        savingCore = _savingCore;
        emit SavingCoreSet(_savingCore);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundVault(uint256 amount) external onlyOwner whenNotPaused {
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit VaultFunded(msg.sender, amount);
    }

    function withdrawVault(uint256 amount) external onlyOwner {
        usdcToken.safeTransfer(msg.sender, amount);
        emit VaultWithdrawn(msg.sender, amount);
    }

    function payInterest(address receiver, uint256 amount) external onlySavingCore whenNotPaused {
        require(usdcToken.balanceOf(address(this)) >= amount, "VaultManager: insufficient vault balance");
        usdcToken.safeTransfer(receiver, amount);
    }
}
