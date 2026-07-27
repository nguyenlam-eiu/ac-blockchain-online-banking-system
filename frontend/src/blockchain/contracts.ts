import { Contract, type ContractRunner } from 'ethers';

import {
  CONTRACT_ADDRESSES,
  type ContractName,
} from './addresses';

export const CONTRACT_ABIS = {
  mockUsdc: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function mint(address to, uint256 amount)',
  ],
  vaultManager: [
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'function usdcToken() view returns (address)',
    'function feeReceiver() view returns (address)',
    'function savingCore() view returns (address)',
    'function totalPromisedInterest() view returns (uint256)',
    'function fundVault(uint256 amount)',
    'function withdrawVault(uint256 amount)',
    'function setFeeReceiver(address newFeeReceiver)',
    'function setSavingCore(address newSavingCore)',
    'function pause()',
    'function unpause()',
    'event VaultFunded(address indexed actor, uint256 amount, uint256 timestamp)',
    'event VaultWithdrawn(address indexed actor, uint256 amount, uint256 timestamp)',
    'event FeeReceiverSet(address indexed actor, address indexed previousFeeReceiver, address indexed newFeeReceiver, uint256 timestamp)',
    'event SystemPaused(address indexed actor, uint256 timestamp)',
    'event SystemUnpaused(address indexed actor, uint256 timestamp)',
  ],
  savingCore: [
    'function owner() view returns (address)',
    'function usdcToken() view returns (address)',
    'function vaultManager() view returns (address)',
    'function nextPlanId() view returns (uint256)',
    'function nextDepositId() view returns (uint256)',
    'function GRACE_PERIOD() view returns (uint256)',
    'function pendingInterest(address account) view returns (uint256)',
    'function plans(uint256 planId) view returns (uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 earlyWithdrawPenaltyBps, bool enabled)',
    'function deposits(uint256 depositId) view returns (uint256 planId, uint256 principal, uint256 startAt, uint256 maturityAt, uint256 aprBpsAtOpen, uint256 earlyWithdrawPenaltyBpsAtOpen, uint256 expectedInterest, uint8 status)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function createPlan(uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 earlyWithdrawPenaltyBps)',
    'function updatePlan(uint256 planId, uint256 newAprBps)',
    'function enablePlan(uint256 planId)',
    'function disablePlan(uint256 planId)',
    'function openDeposit(uint256 planId, uint256 amount)',
    'function withdrawAtMaturity(uint256 depositId)',
    'function earlyWithdraw(uint256 depositId)',
    'function renewDeposit(uint256 depositId)',
    'function autoRenewDeposit(uint256 depositId)',
    'function claimPendingInterest()',
    'event PlanCreated(uint256 indexed planId, address indexed actor, uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 earlyWithdrawPenaltyBps, uint256 timestamp)',
    'event PlanUpdated(uint256 indexed planId, address indexed actor, uint256 previousAprBps, uint256 newAprBps, uint256 timestamp)',
    'event PlanStatusChanged(uint256 indexed planId, address indexed actor, bool enabled, uint256 timestamp)',
  ],
} as const;

export const getContract = (
  contractName: ContractName,
  runner: ContractRunner,
): Contract => {
  const address = CONTRACT_ADDRESSES[contractName];

  if (!address) {
    throw new Error(
      `${contractName} contract address is not configured.`,
    );
  }

  return new Contract(
    address,
    CONTRACT_ABIS[contractName],
    runner,
  );
};
