import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  CONTRACT_ADDRESSES,
} from '../blockchain/addresses';
import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';
import { getErrorMessage } from '../utils/getErrorMessage';

export type AdminPlan = {
  id: bigint;
  tenorDays: bigint;
  aprBps: bigint;
  minDeposit: bigint;
  maxDeposit: bigint;
  earlyWithdrawPenaltyBps: bigint;
  enabled: boolean;
};

type AdminDashboardState = {
  owner: string;
  feeReceiver: string;
  isOwner: boolean;
  isPaused: boolean;
  vaultBalance: bigint;
  totalPromisedInterest: bigint;
  excessLiquidity: bigint;
  plans: AdminPlan[];
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: AdminDashboardState = {
  owner: '',
  feeReceiver: '',
  isOwner: false,
  isPaused: false,
  vaultBalance: 0n,
  totalPromisedInterest: 0n,
  excessLiquidity: 0n,
  plans: [],
  isLoading: false,
  error: '',
};

export const useAdminDashboard = () => {
  const {
    account,
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] =
    useState<AdminDashboardState>(
      INITIAL_STATE,
    );

  const reloadAdminDashboard =
    useCallback(async () => {
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
        const mockUsdc = getContract(
          'mockUsdc',
          provider,
        );
        const vaultManager = getContract(
          'vaultManager',
          provider,
        );
        const savingCore = getContract(
          'savingCore',
          provider,
        );

        const [
          owner,
          feeReceiver,
          paused,
          vaultBalance,
          promisedInterest,
          nextPlanId,
        ] = await Promise.all([
          vaultManager.owner(),
          vaultManager.feeReceiver(),
          vaultManager.paused(),
          mockUsdc.balanceOf(
            CONTRACT_ADDRESSES.vaultManager,
          ),
          vaultManager.totalPromisedInterest(),
          savingCore.nextPlanId(),
        ]);

        const planIds = Array.from(
          {
            length: Math.max(
              0,
              Number(nextPlanId as bigint) - 1,
            ),
          },
          (_, index) => BigInt(index + 1),
        );

        const rawPlans = await Promise.all(
          planIds.map((planId) =>
            savingCore.plans(planId),
          ),
        );

        const plans = rawPlans.map(
          (plan, index): AdminPlan => ({
            id: planIds[index],
            tenorDays:
              plan.tenorDays as bigint,
            aprBps:
              plan.aprBps as bigint,
            minDeposit:
              plan.minDeposit as bigint,
            maxDeposit:
              plan.maxDeposit as bigint,
            earlyWithdrawPenaltyBps:
              plan.earlyWithdrawPenaltyBps as bigint,
            enabled:
              plan.enabled as boolean,
          }),
        );

        const balance =
          vaultBalance as bigint;
        const promised =
          promisedInterest as bigint;

        setState({
          owner: owner as string,
          feeReceiver:
            feeReceiver as string,
          isOwner:
            (owner as string).toLowerCase() ===
            account.toLowerCase(),
          isPaused: paused as boolean,
          vaultBalance: balance,
          totalPromisedInterest:
            promised,
          excessLiquidity:
            balance > promised
              ? balance - promised
              : 0n,
          plans,
          isLoading: false,
          error: '',
        });
      } catch (error) {
        setState({
          ...INITIAL_STATE,
          error: getErrorMessage(
            error,
            'Failed to load administrative data.',
          ),
        });
      }
    }, [
      provider,
      account,
      isConnected,
      isWrongNetwork,
    ]);

  useEffect(() => {
    void reloadAdminDashboard();
  }, [reloadAdminDashboard]);

  return {
    ...state,
    reloadAdminDashboard,
  };
};
