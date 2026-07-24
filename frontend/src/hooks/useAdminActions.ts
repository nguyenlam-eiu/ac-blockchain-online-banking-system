import {
  isAddress,
} from 'ethers';
import {
  useCallback,
  useState,
} from 'react';

import {
  CONTRACT_ADDRESSES,
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import { getContract } from '../blockchain/contracts';
import {
  parseUSDC,
} from '../blockchain/format';
import { useWalletContext } from '../context/WalletContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export type AdminAction =
  | 'fundVault'
  | 'withdrawVault'
  | 'pause'
  | 'unpause'
  | 'createPlan'
  | 'updatePlan'
  | 'enablePlan'
  | 'disablePlan'
  | 'setFeeReceiver';

type AdminActionsState = {
  activeAction: AdminAction | null;
  transactionHash: string;
  error: string;
};

const INITIAL_STATE: AdminActionsState = {
  activeAction: null,
  transactionHash: '',
  error: '',
};

export type CreatePlanInput = {
  tenorDays: string;
  aprBps: string;
  minDeposit: string;
  maxDeposit: string;
  penaltyBps: string;
};

const parsePositiveInteger = (
  value: string,
  fieldName: string,
): bigint => {
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(
      `${fieldName} must be a whole number.`,
    );
  }

  return BigInt(value.trim());
};

export const useAdminActions = () => {
  const {
    account,
    signer,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<AdminActionsState>(
      INITIAL_STATE,
    );

  const requireReady = useCallback(() => {
    if (
      !signer ||
      !account ||
      !isConnected
    ) {
      throw new Error(
        'Connect the owner wallet first.',
      );
    }

    if (isWrongNetwork) {
      throw new Error(
        `Switch MetaMask to ${SUPPORTED_NETWORK_NAME} first.`,
      );
    }
  }, [
    signer,
    account,
    isConnected,
    isWrongNetwork,
  ]);

  const runAction = useCallback(
    async (
      action: AdminAction,
      callback: () => Promise<{
        hash: string;
        wait: () => Promise<unknown>;
      }>,
    ): Promise<boolean> => {
      if (state.activeAction) {
        return false;
      }

      setState({
        activeAction: action,
        transactionHash: '',
        error: '',
      });

      try {
        requireReady();

        const transaction =
          await callback();

        setState({
          activeAction: action,
          transactionHash:
            transaction.hash,
          error: '',
        });

        await transaction.wait();

        setState({
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
            'Administrative transaction failed.',
          ),
        });

        return false;
      }
    },
    [
      requireReady,
      state.activeAction,
    ],
  );

  const fundVault = useCallback(
    async (
      amountInput: string,
    ): Promise<boolean> => {
      const amount =
        parseUSDC(amountInput);

      if (amount <= 0n) {
        setState({
          ...INITIAL_STATE,
          error:
            'Funding amount must be greater than zero.',
        });
        return false;
      }

      return runAction(
        'fundVault',
        async () => {
          requireReady();

          const mockUsdc = getContract(
            'mockUsdc',
            signer!,
          );
          const vaultManager = getContract(
            'vaultManager',
            signer!,
          );

          const allowance =
            (await mockUsdc.allowance(
              account,
              CONTRACT_ADDRESSES.vaultManager,
            )) as bigint;

          if (allowance < amount) {
            const approval =
              await mockUsdc.approve(
                CONTRACT_ADDRESSES.vaultManager,
                amount,
              );
            await approval.wait();
          }

          return vaultManager.fundVault(
            amount,
          );
        },
      );
    },
    [
      account,
      signer,
      requireReady,
      runAction,
    ],
  );

  const withdrawVault = useCallback(
    async (
      amountInput: string,
    ): Promise<boolean> => {
      const amount =
        parseUSDC(amountInput);

      if (amount <= 0n) {
        setState({
          ...INITIAL_STATE,
          error:
            'Withdrawal amount must be greater than zero.',
        });
        return false;
      }

      return runAction(
        'withdrawVault',
        async () => {
          requireReady();
          return getContract(
            'vaultManager',
            signer!,
          ).withdrawVault(amount);
        },
      );
    },
    [
      signer,
      requireReady,
      runAction,
    ],
  );

  const pauseSystem = useCallback(
    () =>
      runAction(
        'pause',
        async () => {
          requireReady();
          return getContract(
            'vaultManager',
            signer!,
          ).pause();
        },
      ),
    [
      signer,
      requireReady,
      runAction,
    ],
  );

  const unpauseSystem = useCallback(
    () =>
      runAction(
        'unpause',
        async () => {
          requireReady();
          return getContract(
            'vaultManager',
            signer!,
          ).unpause();
        },
      ),
    [
      signer,
      requireReady,
      runAction,
    ],
  );

  const createPlan = useCallback(
    async (
      input: CreatePlanInput,
    ): Promise<boolean> => {
      try {
        const tenorDays =
          parsePositiveInteger(
            input.tenorDays,
            'Tenor days',
          );
        const aprBps =
          parsePositiveInteger(
            input.aprBps,
            'APR BPS',
          );
        const minDeposit =
          parseUSDC(input.minDeposit);
        const maxDeposit =
          input.maxDeposit.trim() === ''
            ? 0n
            : parseUSDC(
                input.maxDeposit,
              );
        const penaltyBps =
          parsePositiveInteger(
            input.penaltyBps,
            'Penalty BPS',
          );

        if (
          tenorDays <= 0n ||
          aprBps <= 0n ||
          aprBps > 10000n ||
          penaltyBps > 10000n
        ) {
          throw new Error(
            'Use a positive tenor, APR from 1 to 10000 BPS, and penalty from 0 to 10000 BPS.',
          );
        }

        if (
          maxDeposit > 0n &&
          maxDeposit < minDeposit
        ) {
          throw new Error(
            'Maximum deposit must be zero or greater than or equal to minimum deposit.',
          );
        }

        return runAction(
          'createPlan',
          async () => {
            requireReady();
            return getContract(
              'savingCore',
              signer!,
            ).createPlan(
              tenorDays,
              aprBps,
              minDeposit,
              maxDeposit,
              penaltyBps,
            );
          },
        );
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Invalid plan configuration.',
          ),
        });
        return false;
      }
    },
    [
      signer,
      requireReady,
      runAction,
    ],
  );

  const updatePlanApr = useCallback(
    async (
      planIdInput: string,
      aprBpsInput: string,
    ): Promise<boolean> => {
      try {
        const planId =
          parsePositiveInteger(
            planIdInput,
            'Plan ID',
          );
        const aprBps =
          parsePositiveInteger(
            aprBpsInput,
            'APR BPS',
          );

        if (
          planId <= 0n ||
          aprBps <= 0n ||
          aprBps > 10000n
        ) {
          throw new Error(
            'Enter a valid plan ID and APR from 1 to 10000 BPS.',
          );
        }

        return runAction(
          'updatePlan',
          async () => {
            requireReady();
            return getContract(
              'savingCore',
              signer!,
            ).updatePlan(
              planId,
              aprBps,
            );
          },
        );
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Invalid plan update.',
          ),
        });
        return false;
      }
    },
    [
      signer,
      requireReady,
      runAction,
    ],
  );

  const setPlanEnabled =
    useCallback(
      async (
        planId: bigint,
        enabled: boolean,
      ): Promise<boolean> =>
        runAction(
          enabled
            ? 'enablePlan'
            : 'disablePlan',
          async () => {
            requireReady();

            const savingCore =
              getContract(
                'savingCore',
                signer!,
              );

            return enabled
              ? savingCore.enablePlan(
                  planId,
                )
              : savingCore.disablePlan(
                  planId,
                );
          },
        ),
      [
        signer,
        requireReady,
        runAction,
      ],
    );

  const setFeeReceiver =
    useCallback(
      async (
        addressInput: string,
      ): Promise<boolean> => {
        const address =
          addressInput.trim();

        if (!isAddress(address)) {
          setState({
            ...INITIAL_STATE,
            error:
              'Enter a valid Ethereum fee receiver address.',
          });
          return false;
        }

        return runAction(
          'setFeeReceiver',
          async () => {
            requireReady();
            return getContract(
              'vaultManager',
              signer!,
            ).setFeeReceiver(address);
          },
        );
      },
      [
        signer,
        requireReady,
        runAction,
      ],
    );

  const clearAdminActionState =
    useCallback(() => {
      setState(INITIAL_STATE);
    }, []);

  return {
    ...state,
    isSubmitting:
      state.activeAction !== null,
    fundVault,
    withdrawVault,
    pauseSystem,
    unpauseSystem,
    createPlan,
    updatePlanApr,
    setPlanEnabled,
    setFeeReceiver,
    clearAdminActionState,
  };
};
