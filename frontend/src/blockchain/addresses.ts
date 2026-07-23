import { ethers } from 'ethers';

const SEPOLIA_CHAIN_ID = 11155111n;
const SEPOLIA_NETWORK_NAME = 'Sepolia';
const SEPOLIA_ADDRESSES = {
  mockUsdc: '0x7EE15D3D07a923C2B661824B76E2398DC20F9728',
  vaultManager: '0x2407cCBB5639A41F8A16fda75024a887b90d6C8f',
  savingCore: '0xf907D74280d7c2a52397A933CAbEADbFfeC4fc7F',
} as const;

function resolveConfig() {
  const envChainId = import.meta.env.VITE_CHAIN_ID;
  const envNetworkName = import.meta.env.VITE_NETWORK_NAME;
  const envMockUsdc = import.meta.env.VITE_MOCK_USDC_ADDRESS;
  const envVaultManager = import.meta.env.VITE_VAULT_MANAGER_ADDRESS;
  const envSavingCore = import.meta.env.VITE_SAVING_CORE_ADDRESS;

  const envVars = [envChainId, envNetworkName, envMockUsdc, envVaultManager, envSavingCore];
  const hasAnyEnv = envVars.some((val) => val !== undefined && val !== '');
  const hasAllEnv = envVars.every((val) => val !== undefined && val !== '');

  if (!hasAnyEnv) {
    return {
      chainId: SEPOLIA_CHAIN_ID,
      networkName: SEPOLIA_NETWORK_NAME,
      addresses: SEPOLIA_ADDRESSES,
    };
  }

  if (!hasAllEnv) {
    throw new Error(
      'Incomplete VITE environment configuration. All 5 environment variables (VITE_CHAIN_ID, VITE_NETWORK_NAME, VITE_MOCK_USDC_ADDRESS, VITE_VAULT_MANAGER_ADDRESS, VITE_SAVING_CORE_ADDRESS) must be provided when configuring custom environment.'
    );
  }

  let chainId: bigint;
  try {
    chainId = BigInt(envChainId!);
  } catch {
    throw new Error(`Invalid VITE_CHAIN_ID: "${envChainId}". Must be a valid integer.`);
  }

  if (!ethers.isAddress(envMockUsdc)) {
    throw new Error(`Invalid VITE_MOCK_USDC_ADDRESS: "${envMockUsdc}".`);
  }
  if (!ethers.isAddress(envVaultManager)) {
    throw new Error(`Invalid VITE_VAULT_MANAGER_ADDRESS: "${envVaultManager}".`);
  }
  if (!ethers.isAddress(envSavingCore)) {
    throw new Error(`Invalid VITE_SAVING_CORE_ADDRESS: "${envSavingCore}".`);
  }

  if (chainId === 31337n) {
    if (
      envMockUsdc.toLowerCase() === SEPOLIA_ADDRESSES.mockUsdc.toLowerCase() ||
      envVaultManager.toLowerCase() === SEPOLIA_ADDRESSES.vaultManager.toLowerCase() ||
      envSavingCore.toLowerCase() === SEPOLIA_ADDRESSES.savingCore.toLowerCase()
    ) {
      throw new Error('Localhost chain ID 31337 cannot be combined with default Sepolia fallback contract addresses.');
    }
  }

  return {
    chainId,
    networkName: envNetworkName!,
    addresses: {
      mockUsdc: envMockUsdc!,
      vaultManager: envVaultManager!,
      savingCore: envSavingCore!,
    },
  };
}

const resolved = resolveConfig();

export const SUPPORTED_CHAIN_ID = resolved.chainId;
export const SUPPORTED_NETWORK_NAME = resolved.networkName;
export const CONTRACT_ADDRESSES = resolved.addresses;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export const isContractAddressConfigured = (contractName: ContractName): boolean => {
  return CONTRACT_ADDRESSES[contractName].length > 0 && ethers.isAddress(CONTRACT_ADDRESSES[contractName]);
};

export const getTxExplorerUrl = (txHash: string): string | null => {
  if (!txHash) return null;
  if (SUPPORTED_CHAIN_ID === 11155111n) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (SUPPORTED_CHAIN_ID === 1n) {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return null;
};
