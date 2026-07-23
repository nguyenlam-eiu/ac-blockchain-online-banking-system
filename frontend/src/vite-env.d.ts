/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_NETWORK_NAME?: string;
  readonly VITE_MOCK_USDC_ADDRESS?: string;
  readonly VITE_VAULT_MANAGER_ADDRESS?: string;
  readonly VITE_SAVING_CORE_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
