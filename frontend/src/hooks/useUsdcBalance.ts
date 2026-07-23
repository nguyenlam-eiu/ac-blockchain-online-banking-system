import { useCallback, useEffect, useState } from 'react';

import { formatUSDC } from '../blockchain/format';
import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

type UsdcBalanceState = {
  balance: bigint;
  formattedBalance: string;
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: UsdcBalanceState = {
  balance: 0n,
  formattedBalance: '0.00',
  isLoading: false,
  error: '',
};

export const useUsdcBalance = () => {
  const {
    account,
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<UsdcBalanceState>(INITIAL_STATE);

  const loadBalance = useCallback(async () => {
    if (
      !provider ||
      !account ||
      !isConnected ||
      isWrongNetwork
    ) {
      setState(INITIAL_STATE);
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }));

    try {
      const mockUsdc = getContract('mockUsdc', provider);

      const balance = await mockUsdc.balanceOf(account) as bigint;

      setState({
        balance,
        formattedBalance: formatUSDC(balance),
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load MockUSDC balance.';

      setState({
        balance: 0n,
        formattedBalance: '0.00',
        isLoading: false,
        error: message,
      });
    }
  }, [
    account,
    provider,
    isConnected,
    isWrongNetwork,
  ]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  return {
    ...state,
    reloadBalance: loadBalance,
  };
};
