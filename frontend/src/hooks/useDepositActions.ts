import { useCallback, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

export type DepositAction =
  | 'earlyWithdraw'
  | 'withdrawAtMaturity'
  | 'renewDeposit';

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
    useState<DepositActionsState>(INITIAL_STATE);

  const executeAction = useCallback(
    async (
      depositId: bigint,
      action: DepositAction,
    ): Promise<boolean> => {
      if (!signer || !isConnected || isWrongNetwork) {
        setState({
          activeDepositId: null,
          activeAction: null,
          transactionHash: '',
          error: 'Connect MetaMask on Sepolia first.',
        });

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
            ? await savingCore.earlyWithdraw(depositId)
            : action === 'withdrawAtMaturity'
              ? await savingCore.withdrawAtMaturity(
                  depositId,
                )
              : await savingCore.renewDeposit(depositId);

        setState((current) => ({
          ...current,
          transactionHash: transaction.hash,
        }));

        await transaction.wait();

        setState({
          activeDepositId: null,
          activeAction: null,
          transactionHash: transaction.hash,
          error: '',
        });

        return true;
      } catch (error) {
        const isUserRejected =
          error instanceof Error &&
          (
            error.message.includes('ACTION_REJECTED') ||
            error.message.includes('user rejected') ||
            error.message.includes('4001')
          );

        const message = isUserRejected
          ? 'Transaction was rejected.'
          : error instanceof Error
            ? error.message
            : 'Deposit transaction failed.';

        setState({
          activeDepositId: null,
          activeAction: null,
          transactionHash: '',
          error: message,
        });

        return false;
      }
    },
    [
      signer,
      isConnected,
      isWrongNetwork,
    ],
  );

  const clearDepositActionState = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,

    isSubmitting:
      state.activeDepositId !== null &&
      state.activeAction !== null,

    earlyWithdraw: (depositId: bigint) =>
      executeAction(depositId, 'earlyWithdraw'),

    withdrawAtMaturity: (depositId: bigint) =>
      executeAction(
        depositId,
        'withdrawAtMaturity',
      ),

    renewDeposit: (depositId: bigint) =>
      executeAction(depositId, 'renewDeposit'),

    clearDepositActionState,
  };
};
