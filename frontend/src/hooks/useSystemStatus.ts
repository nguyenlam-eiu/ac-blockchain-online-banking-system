import { useCallback, useEffect, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

type SystemStatusState = {
  isPaused: boolean;
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: SystemStatusState = {
  isPaused: false,
  isLoading: false,
  error: '',
};

export const useSystemStatus = () => {
  const {
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<SystemStatusState>(INITIAL_STATE);

  const loadSystemStatus = useCallback(async () => {
    if (
      !provider ||
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
      const vaultManager = getContract(
        'vaultManager',
        provider,
      );

      const isPaused =
        await vaultManager.paused() as boolean;

      setState({
        isPaused,
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load system status.';

      setState({
        isPaused: false,
        isLoading: false,
        error: message,
      });
    }
  }, [
    provider,
    isConnected,
    isWrongNetwork,
  ]);

  useEffect(() => {
    void loadSystemStatus();
  }, [loadSystemStatus]);

  return {
    ...state,
    reloadSystemStatus: loadSystemStatus,
  };
};
