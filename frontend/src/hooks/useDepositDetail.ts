import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';
import {
  type UserDeposit,
} from './useDeposits';

type DepositDetailState = {
  deposit: UserDeposit | null;
  owner: string;
  blockTimestamp: bigint | null;
  gracePeriod: bigint;
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: DepositDetailState = {
  deposit: null,
  owner: '',
  blockTimestamp: null,
  gracePeriod: 0n,
  isLoading: false,
  error: '',
};

export const useDepositDetail = (
  depositId: bigint | null,
) => {
  const {
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<DepositDetailState>(
      INITIAL_STATE,
    );

  const loadDepositDetail =
    useCallback(async () => {
      if (
        !provider ||
        !isConnected ||
        isWrongNetwork ||
        depositId === null
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

        const [
          nextDepositId,
          owner,
          rawDeposit,
          gracePeriod,
          latestBlock,
        ] = await Promise.all([
          savingCore.nextDepositId(),
          savingCore.ownerOf(depositId),
          savingCore.deposits(depositId),
          savingCore.GRACE_PERIOD(),
          provider.getBlock('latest'),
        ]);

        if (
          depositId <= 0n ||
          depositId >=
            (nextDepositId as bigint)
        ) {
          throw new Error(
            'Deposit certificate does not exist.',
          );
        }

        if (!latestBlock) {
          throw new Error(
            'Unable to read the latest blockchain block.',
          );
        }

        setState({
          deposit: {
            id: depositId,
            planId:
              rawDeposit.planId as bigint,
            principal:
              rawDeposit.principal as bigint,
            startAt:
              rawDeposit.startAt as bigint,
            maturityAt:
              rawDeposit.maturityAt as bigint,
            aprBpsAtOpen:
              rawDeposit.aprBpsAtOpen as bigint,
            earlyWithdrawPenaltyBpsAtOpen:
              rawDeposit.earlyWithdrawPenaltyBpsAtOpen as bigint,
            expectedInterest:
              rawDeposit.expectedInterest as bigint,
            status: BigInt(
              rawDeposit.status,
            ),
          },
          owner: owner as string,
          blockTimestamp: BigInt(
            latestBlock.timestamp,
          ),
          gracePeriod:
            gracePeriod as bigint,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load deposit certificate.',
        });
      }
    }, [
      provider,
      isConnected,
      isWrongNetwork,
      depositId,
    ]);

  useEffect(() => {
    void loadDepositDetail();
  }, [loadDepositDetail]);

  return {
    ...state,
    reloadDepositDetail:
      loadDepositDetail,
  };
};
