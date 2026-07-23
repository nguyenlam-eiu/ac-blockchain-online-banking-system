import { useCallback, useEffect, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { formatUSDC } from '../blockchain/format';
import { useWalletContext } from '../context/WalletContext';

const ACTIVE_STATUS = 0n;

type DepositSummaryState = {
  totalDeposited: bigint;
  formattedTotalDeposited: string;
  activeDepositCount: number;
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: DepositSummaryState = {
  totalDeposited: 0n,
  formattedTotalDeposited: '0.0',
  activeDepositCount: 0,
  isLoading: false,
  error: '',
};

export const useDepositSummary = () => {
  const {
    account,
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<DepositSummaryState>(INITIAL_STATE);

  const loadDepositSummary = useCallback(async () => {
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

      const nextDepositId =
        await savingCore.nextDepositId() as bigint;

      let totalDeposited = 0n;
      let activeDepositCount = 0;

      for (
        let depositId = 1n;
        depositId < nextDepositId;
        depositId++
      ) {
        try {
          const owner =
            await savingCore.ownerOf(depositId) as string;

          if (owner.toLowerCase() !== account.toLowerCase()) {
            continue;
          }

          const deposit =
            await savingCore.deposits(depositId);

          const principal = deposit.principal as bigint;
          const status = BigInt(deposit.status);

          if (status === ACTIVE_STATUS) {
            totalDeposited += principal;
            activeDepositCount++;
          }
        } catch {
          // Skip invalid or unavailable deposit IDs.
        }
      }

      setState({
        totalDeposited,
        formattedTotalDeposited:
          formatUSDC(totalDeposited),
        activeDepositCount,
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load deposit summary.';

      setState({
        ...INITIAL_STATE,
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
    void loadDepositSummary();
  }, [loadDepositSummary]);

  return {
    ...state,
    reloadDepositSummary: loadDepositSummary,
  };
};
