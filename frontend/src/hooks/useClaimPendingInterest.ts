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

type ClaimPendingInterestState = {
  isSubmitting: boolean;
  transactionHash: string;
  error: string;
};

const INITIAL_STATE: ClaimPendingInterestState = {
  isSubmitting: false,
  transactionHash: '',
  error: '',
};

export const useClaimPendingInterest = () => {
  const {
    signer,
    account,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<ClaimPendingInterestState>(
      INITIAL_STATE,
    );

  const claimPendingInterest =
    useCallback(async (): Promise<boolean> => {
      if (
        !signer ||
        !account ||
        !isConnected
      ) {
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

      if (state.isSubmitting) {
        return false;
      }

      setState({
        isSubmitting: true,
        transactionHash: '',
        error: '',
      });

      try {
        const savingCore = getContract(
          'savingCore',
          signer,
        );

        const transaction =
          await savingCore.claimPendingInterest();

        setState({
          isSubmitting: true,
          transactionHash: transaction.hash,
          error: '',
        });

        await transaction.wait();

        setState({
          isSubmitting: false,
          transactionHash: transaction.hash,
          error: '',
        });

        return true;
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Failed to claim pending interest.',
          ),
        });

        return false;
      }
    }, [
      signer,
      account,
      isConnected,
      isWrongNetwork,
      state.isSubmitting,
    ]);

  const clearClaimPendingInterestState =
    useCallback(() => {
      setState(INITIAL_STATE);
    }, []);

  return {
    ...state,
    claimPendingInterest,
    clearClaimPendingInterestState,
  };
};
