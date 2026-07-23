export const SUPPORTED_CHAIN_ID = 11155111n;

export const SUPPORTED_NETWORK_NAME = 'Sepolia';

export const CONTRACT_ADDRESSES = {
  mockUsdc: '0x7EE15D3D07a923C2B661824B76E2398DC20F9728',
  vaultManager: '0x2407cCBB5639A41F8A16fda75024a887b90d6C8f',
  savingCore: '0xf907D74280d7c2a52397A933CAbEADbFfeC4fc7F',
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export const isContractAddressConfigured = (
  contractName: ContractName,
): boolean => {
  return CONTRACT_ADDRESSES[contractName].length > 0;
};
