import { useCallback, useEffect, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { formatUSDC } from '../blockchain/format';
import { useWalletContext } from '../context/WalletContext';

type PendingInterestState = {
  pendingInterest: bigint;
  formattedPendingInterest: string;
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: PendingInterestState = {
  pendingInterest: 0n,
  formattedPendingInterest: '0.0',
  isLoading: false,
  error: '',
};

export const usePendingInterest = () => {
  const {
    account,
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<PendingInterestState>(INITIAL_STATE);

  const loadPendingInterest = useCallback(async () => {
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
      const savingCore = getContract(
        'savingCore',
        provider,
      );

      const pendingInterest =
        await savingCore.pendingInterest(account) as bigint;

      setState({
        pendingInterest,
        formattedPendingInterest:
          formatUSDC(pendingInterest),
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load pending interest.';

      setState({
        pendingInterest: 0n,
        formattedPendingInterest: '0.0',
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
    void loadPendingInterest();
  }, [loadPendingInterest]);

  return {
    ...state,
    reloadPendingInterest: loadPendingInterest,
  };
};
