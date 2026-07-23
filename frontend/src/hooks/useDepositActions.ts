import {
  useCallback,
  useState,
} from 'react';

import {
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export type DepositAction =
  | 'earlyWithdraw'
  | 'withdrawAtMaturity'
  | 'renewDeposit'
  | 'autoRenewDeposit';

type DepositActionsState = {
  activeDepositId: bigint | null;
  activeAction: DepositAction | null;
  transactionHash: string;
  error: string;
};

const INITIAL_STATE: DepositActionsState = {
  activeDepositId: null,
  activeAction: null,
  transactionHash: '',
  error: '',
};

export const useDepositActions = () => {
  const {
    signer,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<DepositActionsState>(
      INITIAL_STATE,
    );

  const executeAction = useCallback(
    async (
      depositId: bigint,
      action: DepositAction,
    ): Promise<boolean> => {
      if (!signer || !isConnected) {
        setState({
          ...INITIAL_STATE,
          error: 'Connect MetaMask first.',
        });

        return false;
      }

      if (isWrongNetwork) {
        setState({
          ...INITIAL_STATE,
          error: `Switch MetaMask to ${SUPPORTED_NETWORK_NAME} first.`,
        });

        return false;
      }

      if (
        state.activeDepositId !== null &&
        state.activeAction !== null
      ) {
        return false;
      }

      setState({
        activeDepositId: depositId,
        activeAction: action,
        transactionHash: '',
        error: '',
      });

      try {
        const savingCore = getContract(
          'savingCore',
          signer,
        );

        const transaction =
          action === 'earlyWithdraw'
            ? await savingCore.earlyWithdraw(
                depositId,
              )
            : action === 'withdrawAtMaturity'
              ? await savingCore.withdrawAtMaturity(
                  depositId,
                )
              : action === 'renewDeposit'
                ? await savingCore.renewDeposit(
                    depositId,
                  )
                : await savingCore.autoRenewDeposit(
                    depositId,
                  );

        setState((current) => ({
          ...current,
          transactionHash:
            transaction.hash,
        }));

        await transaction.wait();

        setState({
          activeDepositId: null,
          activeAction: null,
          transactionHash:
            transaction.hash,
          error: '',
        });

        return true;
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Deposit transaction failed.',
          ),
        });

        return false;
      }
    },
    [
      signer,
      isConnected,
      isWrongNetwork,
      state.activeDepositId,
      state.activeAction,
    ],
  );

  const clearDepositActionState =
    useCallback(() => {
      setState(INITIAL_STATE);
    }, []);

  return {
    ...state,
    isSubmitting:
      state.activeDepositId !== null &&
      state.activeAction !== null,
    earlyWithdraw: (
      depositId: bigint,
    ) =>
      executeAction(
        depositId,
        'earlyWithdraw',
      ),
    withdrawAtMaturity: (
      depositId: bigint,
    ) =>
      executeAction(
        depositId,
        'withdrawAtMaturity',
      ),
    renewDeposit: (
      depositId: bigint,
    ) =>
      executeAction(
        depositId,
        'renewDeposit',
      ),
    autoRenewDeposit: (
      depositId: bigint,
    ) =>
      executeAction(
        depositId,
        'autoRenewDeposit',
      ),
    clearDepositActionState,
  };
};
