import { useCallback, useEffect, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

export const DEPOSIT_STATUS = {
  active: 0n,
  withdrawn: 1n,
  manualRenewed: 2n,
  autoRenewed: 3n,
} as const;

export type UserDeposit = {
  id: bigint;
  planId: bigint;
  principal: bigint;
  startAt: bigint;
  maturityAt: bigint;
  aprBpsAtOpen: bigint;
  earlyWithdrawPenaltyBpsAtOpen: bigint;
  expectedInterest: bigint;
  status: bigint;
};

type DepositsState = {
  deposits: UserDeposit[];
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: DepositsState = {
  deposits: [],
  isLoading: false,
  error: '',
};

export const useDeposits = () => {
  const {
    account,
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<DepositsState>(INITIAL_STATE);

  const loadDeposits = useCallback(async () => {
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

      const deposits: UserDeposit[] = [];

      for (
        let depositId = 1n;
        depositId < nextDepositId;
        depositId++
      ) {
        try {
          const owner =
            await savingCore.ownerOf(depositId) as string;

          if (
            owner.toLowerCase() !==
            account.toLowerCase()
          ) {
            continue;
          }

          const deposit =
            await savingCore.deposits(depositId);

          deposits.push({
            id: depositId,
            planId: deposit.planId as bigint,
            principal: deposit.principal as bigint,
            startAt: deposit.startAt as bigint,
            maturityAt: deposit.maturityAt as bigint,
            aprBpsAtOpen:
              deposit.aprBpsAtOpen as bigint,
            earlyWithdrawPenaltyBpsAtOpen:
              deposit.earlyWithdrawPenaltyBpsAtOpen as bigint,
            expectedInterest:
              deposit.expectedInterest as bigint,
            status: BigInt(deposit.status),
          });
        } catch {
          // Skip unavailable or invalid deposit IDs.
        }
      }

      deposits.sort((left, right) =>
        left.id > right.id ? -1 : 1,
      );

      setState({
        deposits,
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load deposits.';

      setState({
        deposits: [],
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
    void loadDeposits();
  }, [loadDeposits]);

  return {
    ...state,
    reloadDeposits: loadDeposits,
  };
};
