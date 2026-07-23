import {
  CalendarDays,
  CircleDollarSign,
  Percent,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import {
  formatBps,
  formatUSDC,
} from '../blockchain/format';
import type { SavingPlan } from '../hooks/usePlans';
import { OpenDepositForm } from './OpenDepositForm';

type PlanCardProps = {
  plan: SavingPlan;
  onDepositOpened: () => void;
};

export const PlanCard = ({
  plan,
  onDepositOpened,
}: PlanCardProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Saving Plan #{plan.id.toString()}
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {plan.tenorDays.toString()} Day Term Deposit
          </h2>
        </div>

        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            plan.enabled
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600',
          ].join(' ')}
        >
          {plan.enabled ? 'Available' : 'Disabled'}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />
            <p className="text-sm">Tenor</p>
          </div>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            {plan.tenorDays.toString()} days
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Percent className="h-4 w-4" />
            <p className="text-sm">Annual Percentage Rate</p>
          </div>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatBps(plan.aprBps)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CircleDollarSign className="h-4 w-4" />
            <p className="text-sm">Deposit Range</p>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatUSDC(plan.minDeposit)}–
            {formatUSDC(plan.maxDeposit)} USDC
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            <p className="text-sm">
              Early Withdrawal Penalty
            </p>
          </div>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatBps(plan.earlyWithdrawPenaltyBps)}
          </p>
        </div>
      </div>

      {!isFormOpen && (
        <button
          type="button"
          disabled={!plan.enabled}
          onClick={() => setIsFormOpen(true)}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {plan.enabled
            ? 'Open Deposit'
            : 'Plan Unavailable'}
        </button>
      )}

      {isFormOpen && (
        <OpenDepositForm
          plan={plan}
          onCancel={() => setIsFormOpen(false)}
          onSuccess={onDepositOpened}
        />
      )}
    </article>
  );
};
