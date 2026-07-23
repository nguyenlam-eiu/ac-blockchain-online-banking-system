import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";

import { SUPPORTED_CHAIN_ID } from "../blockchain/addresses";

type MetaMaskProvider = Eip1193Provider & {
  on?: (event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void) => void;

  removeListener?: (event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}

type WalletState = {
  account: string;
  chainId: bigint | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  isConnecting: boolean;
  error: string;
};

const INITIAL_STATE: WalletState = {
  account: "",
  chainId: null,
  provider: null,
  signer: null,
  isConnecting: false,
  error: "",
};

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_STATE);

  const isMetaMaskAvailable = typeof window !== "undefined" && typeof window.ethereum !== "undefined";

  const loadWalletState = useCallback(async () => {
    if (!window.ethereum) {
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      const network = await provider.getNetwork();

      if (accounts.length === 0) {
        setWallet((current) => ({
          ...current,
          account: "",
          chainId: network.chainId,
          provider,
          signer: null,
          error: "",
        }));

        return;
      }

      const signer = await provider.getSigner();

      setWallet((current) => ({
        ...current,
        account: accounts[0],
        chainId: network.chainId,
        provider,
        signer,
        error: "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load wallet state.";

      setWallet((current) => ({
        ...current,
        error: message,
      }));
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setWallet((current) => ({
        ...current,
        error: "MetaMask is not installed.",
      }));

      return;
    }

    setWallet((current) => ({
      ...current,
      isConnecting: true,
      error: "",
    }));

    try {
      const provider = new BrowserProvider(window.ethereum);

      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();

      setWallet({
        account,
        chainId: network.chainId,
        provider,
        signer,
        isConnecting: false,
        error: "",
      });
    } catch (error) {
      const isUserRejected =
        error instanceof Error &&
        (error.message.includes("ACTION_REJECTED") ||
          error.message.includes("user rejected") ||
          error.message.includes("4001"));

      const message = isUserRejected
        ? "Wallet connection was rejected."
        : error instanceof Error
        ? error.message
        : "Failed to connect wallet.";

      setWallet((current) => ({
        ...current,
        isConnecting: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    void loadWalletState();
  }, [loadWalletState]);

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const handleAccountsChanged = () => {
      void loadWalletState();
    };

    const handleChainChanged = () => {
      void loadWalletState();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);

      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [loadWalletState]);

  const isConnected = wallet.account.length > 0;

  const isWrongNetwork = wallet.chainId !== null && wallet.chainId !== SUPPORTED_CHAIN_ID;

  return {
    ...wallet,
    isMetaMaskAvailable,
    isConnected,
    isWrongNetwork,
    connectWallet,
  };
};
