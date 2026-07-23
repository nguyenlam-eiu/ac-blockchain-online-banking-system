export const SUPPORTED_CHAIN_ID = 11155111n;

export const SUPPORTED_NETWORK_NAME = 'Sepolia';

export const CONTRACT_ADDRESSES = {
  mockUsdc: '',
  vaultManager: '',
  savingCore: '',
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export const isContractAddressConfigured = (
  contractName: ContractName,
): boolean => {
  return CONTRACT_ADDRESSES[contractName].length > 0;
};
