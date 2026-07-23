import { useCallback, useEffect, useState } from 'react';

import { getContract } from '../blockchain/contracts';
import { useWalletContext } from '../context/WalletContext';

export type SavingPlan = {
  id: bigint;
  tenorDays: bigint;
  aprBps: bigint;
  minDeposit: bigint;
  maxDeposit: bigint;
  earlyWithdrawPenaltyBps: bigint;
  enabled: boolean;
};

type PlansState = {
  plans: SavingPlan[];
  isLoading: boolean;
  error: string;
};

const INITIAL_STATE: PlansState = {
  plans: [],
  isLoading: false,
  error: '',
};

export const usePlans = () => {
  const {
    provider,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const [state, setState] = useState<PlansState>(INITIAL_STATE);

  const loadPlans = useCallback(async () => {
    if (!provider || !isConnected || isWrongNetwork) {
      setState(INITIAL_STATE);
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      error: '',
    }));

    try {
      const savingCore = getContract('savingCore', provider);

      const nextPlanId =
        await savingCore.nextPlanId() as bigint;

      const plans: SavingPlan[] = [];

      for (
        let planId = 1n;
        planId < nextPlanId;
        planId++
      ) {
        const plan = await savingCore.plans(planId);

        plans.push({
          id: planId,
          tenorDays: plan.tenorDays as bigint,
          aprBps: plan.aprBps as bigint,
          minDeposit: plan.minDeposit as bigint,
          maxDeposit: plan.maxDeposit as bigint,
          earlyWithdrawPenaltyBps:
            plan.earlyWithdrawPenaltyBps as bigint,
          enabled: plan.enabled as boolean,
        });
      }

      setState({
        plans,
        isLoading: false,
        error: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load saving plans.';

      setState({
        plans: [],
        isLoading: false,
        error: message,
      });
    }
  }, [
    provider,
    isConnected,
    isWrongNetwork,
  ]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  return {
    ...state,
    reloadPlans: loadPlans,
  };
};
