export const LOCAL_CHAIN_ID = 31337n;

export const LOCAL_NETWORK_NAME = 'Hardhat Localhost';

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
