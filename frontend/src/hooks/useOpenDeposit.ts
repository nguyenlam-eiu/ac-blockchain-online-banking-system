import { useCallback, useState } from 'react';

import { CONTRACT_ADDRESSES } from '../blockchain/addresses';
import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

type OpenDepositState = {
  isApproving: boolean;
  isOpeningDeposit: boolean;
  error: string;
  transactionHash: string;
};

const INITIAL_STATE: OpenDepositState = {
  isApproving: false,
  isOpeningDeposit: false,
  error: '',
  transactionHash: '',
};

export const useOpenDeposit = () => {
  const {
    signer,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<OpenDepositState>(INITIAL_STATE);

  const openDeposit = useCallback(
    async (
      planId: bigint,
      amount: bigint,
    ): Promise<boolean> => {
      if (!signer || !isConnected || isWrongNetwork) {
        setState((current) => ({
          ...current,
          error: 'Connect MetaMask on Sepolia first.',
        }));

        return false;
      }

      setState({
        isApproving: true,
        isOpeningDeposit: false,
        error: '',
        transactionHash: '',
      });

      try {
        const mockUsdc = getContract('mockUsdc', signer);
        const savingCore = getContract('savingCore', signer);

        const approveTransaction = await mockUsdc.approve(
          CONTRACT_ADDRESSES.savingCore,
          amount,
        );

        await approveTransaction.wait();

        setState({
          isApproving: false,
          isOpeningDeposit: true,
          error: '',
          transactionHash: '',
        });

        const depositTransaction =
          await savingCore.openDeposit(planId, amount);

        setState((current) => ({
          ...current,
          transactionHash: depositTransaction.hash,
        }));

        await depositTransaction.wait();

        setState({
          isApproving: false,
          isOpeningDeposit: false,
          error: '',
          transactionHash: depositTransaction.hash,
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
            : 'Failed to open deposit.';

        setState({
          isApproving: false,
          isOpeningDeposit: false,
          error: message,
          transactionHash: '',
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

  const clearOpenDepositState = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    openDeposit,
    clearOpenDepositState,
  };
};
