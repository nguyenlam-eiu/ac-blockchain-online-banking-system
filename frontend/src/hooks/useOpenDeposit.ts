import { useCallback, useState } from 'react';

import { CONTRACT_ADDRESSES, SUPPORTED_NETWORK_NAME } from '../blockchain/addresses';
import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';
import { getErrorMessage } from '../utils/getErrorMessage';

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
    account,
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
      if (!signer || !account || !isConnected) {
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

      setState({
        isApproving: true,
        isOpeningDeposit: false,
        error: '',
        transactionHash: '',
      });

      try {
        const mockUsdc = getContract(
          'mockUsdc',
          signer,
        );

        const savingCore = getContract(
          'savingCore',
          signer,
        );

        const balance =
          await mockUsdc.balanceOf(account) as bigint;

        if (balance < amount) {
          setState({
            ...INITIAL_STATE,
            error:
              'Your MockUSDC balance is lower than the deposit amount.',
          });

          return false;
        }

        const allowance =
          await mockUsdc.allowance(
            account,
            CONTRACT_ADDRESSES.savingCore,
          ) as bigint;

        if (allowance < amount) {
          const approvalTransaction =
            await mockUsdc.approve(
              CONTRACT_ADDRESSES.savingCore,
              amount,
            );

          await approvalTransaction.wait();
        }

        setState({
          isApproving: false,
          isOpeningDeposit: true,
          error: '',
          transactionHash: '',
        });

        const depositTransaction =
          await savingCore.openDeposit(
            planId,
            amount,
          );

        setState((current) => ({
          ...current,
          transactionHash:
            depositTransaction.hash,
        }));

        await depositTransaction.wait();

        setState({
          isApproving: false,
          isOpeningDeposit: false,
          error: '',
          transactionHash:
            depositTransaction.hash,
        });

        return true;
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Failed to open deposit.',
          ),
        });

        return false;
      }
    },
    [
      signer,
      account,
      isConnected,
      isWrongNetwork,
    ],
  );

  const clearOpenDepositState =
    useCallback(() => {
      setState(INITIAL_STATE);
    }, []);

  return {
    ...state,
    openDeposit,
    clearOpenDepositState,
  };
};
