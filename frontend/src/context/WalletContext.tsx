import {
  createContext,
  type ReactNode,
  useContext,
} from 'react';

import { useWallet } from '../hooks/useWallet';

type WalletContextValue = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletContextValue | null>(null);

type WalletProviderProps = {
  children: ReactNode;
};

export const WalletProvider = ({
  children,
}: WalletProviderProps) => {
  const wallet = useWallet();

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = (): WalletContextValue => {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error(
      'useWalletContext must be used within WalletProvider.',
    );
  }

  return context;
};
