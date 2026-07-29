import {
  Bot,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Percent,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getTxExplorerUrl } from '../blockchain/addresses';
import {
  formatBps,
  formatTimestamp,
  formatUSDC,
} from '../blockchain/format';
import {
  type DepositAction,
  useDepositActions,
} from '../hooks/useDepositActions';
import {
  DEPOSIT_STATUS,
  type UserDeposit,
} from '../hooks/useDeposits';
import { usePlans } from '../hooks/usePlans';

type DepositCardProps = {
  deposit: UserDeposit;
  blockTimestamp: bigint | null;
  gracePeriod?: bigint;
  onActionCompleted: () => void;
};

const getStatusLabel = (status: bigint): string => {
  if (status === DEPOSIT_STATUS.active) {
    return 'Active';
  }

  if (status === DEPOSIT_STATUS.withdrawn) {
    return 'Withdrawn';
  }

  if (status === DEPOSIT_STATUS.manualRenewed) {
    return 'Manually Renewed';
  }

  if (status === DEPOSIT_STATUS.autoRenewed) {
    return 'Automatically Renewed';
  }

  return 'Unknown';
};

const getStatusClassName = (
  status: bigint,
): string => {
  if (status === DEPOSIT_STATUS.active) {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === DEPOSIT_STATUS.withdrawn) {
    return 'bg-slate-100 text-slate-600';
  }

  return 'bg-blue-50 text-blue-700';
};

const getActionLabel = (
  action: DepositAction | null,
): string => {
  if (
    action === 'earlyWithdraw' ||
    action === 'withdrawAtMaturity'
  ) {
    return 'Withdrawing...';
  }

  if (action === 'renewDeposit') {
    return 'Renewing...';
  }

  return 'Processing...';
};

export const DepositCard = ({
  deposit,
  blockTimestamp,
  gracePeriod = 3n * 24n * 60n * 60n,
  onActionCompleted,
}: DepositCardProps) => {
  const [
    confirmationAction,
    setConfirmationAction,
  ] = useState<DepositAction | null>(null);

  const [selectedPlanId, setSelectedPlanId] =
    useState('');

  const [planSelectionError, setPlanSelectionError] =
    useState('');

  const {
    plans,
    isLoading: isLoadingPlans,
    error: plansError,
    reloadPlans,
  } = usePlans();

  const {
    activeDepositId,
    activeAction,
    transactionHash,
    error,
    isSubmitting,
    earlyWithdraw,
    withdrawAtMaturity,
    renewDeposit,
    clearDepositActionState,
  } = useDepositActions();

  const enabledPlans = useMemo(
    () => plans.filter((plan) => plan.enabled),
    [plans],
  );

  const selectedPlan = useMemo(
    () =>
      enabledPlans.find(
        (plan) =>
          plan.id.toString() === selectedPlanId,
      ) ?? null,
    [enabledPlans, selectedPlanId],
  );

  useEffect(() => {
    if (selectedPlanId) {
      const selectedPlanStillExists =
        enabledPlans.some(
          (plan) =>
            plan.id.toString() === selectedPlanId,
        );

      if (selectedPlanStillExists) {
        return;
      }
    }

    const currentPlan = enabledPlans.find(
      (plan) => plan.id === deposit.planId,
    );

    if (currentPlan) {
      setSelectedPlanId(
        currentPlan.id.toString(),
      );
      return;
    }

    if (enabledPlans.length > 0) {
      setSelectedPlanId(
        enabledPlans[0].id.toString(),
      );
      return;
    }

    setSelectedPlanId('');
  }, [
    deposit.planId,
    enabledPlans,
    selectedPlanId,
  ]);

  const isActive =
    deposit.status === DEPOSIT_STATUS.active;

  const isMatured =
    isActive &&
    blockTimestamp !== null &&
    blockTimestamp >= deposit.maturityAt;

  const graceDeadline =
    deposit.maturityAt + gracePeriod;

  const isManualActionAvailable =
    isMatured &&
    blockTimestamp !== null &&
    blockTimestamp <= graceDeadline;

  const isAfterGracePeriod =
    isMatured &&
    blockTimestamp !== null &&
    blockTimestamp > graceDeadline;

  const isExactGraceDeadline =
    isMatured &&
    blockTimestamp !== null &&
    blockTimestamp === graceDeadline;

  const isThisDepositSubmitting =
    isSubmitting &&
    activeDepositId === deposit.id;

  const closeConfirmation = () => {
    setConfirmationAction(null);
    setPlanSelectionError('');
    clearDepositActionState();
  };

  const openConfirmation = (
    action: DepositAction,
  ) => {
    setPlanSelectionError('');
    clearDepositActionState();

    if (action === 'renewDeposit') {
      void reloadPlans();
    }

    setConfirmationAction(action);
  };

  const executeConfirmedAction = async () => {
    if (!confirmationAction) {
      return;
    }

    clearDepositActionState();
    setPlanSelectionError('');

    let success = false;

    if (confirmationAction === 'earlyWithdraw') {
      success = await earlyWithdraw(deposit.id);
    } else if (
      confirmationAction === 'withdrawAtMaturity'
    ) {
      success = await withdrawAtMaturity(
        deposit.id,
      );
    } else if (
      confirmationAction === 'renewDeposit'
    ) {
      if (!selectedPlanId) {
        setPlanSelectionError(
          'Select an enabled saving plan.',
        );
        return;
      }

      const planId = BigInt(selectedPlanId);

      const isValidPlan = enabledPlans.some(
        (plan) => plan.id === planId,
      );

      if (!isValidPlan) {
        setPlanSelectionError(
          'The selected saving plan is not available.',
        );
        return;
      }

      success = await renewDeposit(
        deposit.id,
        planId,
      );
    }

    if (success) {
      setConfirmationAction(null);
      setPlanSelectionError('');
      onActionCompleted();
    }
  };

  const confirmationMessage =
    confirmationAction === 'earlyWithdraw'
      ? `Early withdrawal applies a ${formatBps(
          deposit.earlyWithdrawPenaltyBpsAtOpen,
        )} penalty and pays no interest. Continue?`
      : confirmationAction ===
          'withdrawAtMaturity'
        ? 'Withdraw the principal and available interest from this matured certificate?'
        : confirmationAction === 'renewDeposit'
          ? 'Select the saving plan for the new certificate. Earned interest from the old certificate will be added to the new principal.'
          : '';

  const explorerUrl =
    getTxExplorerUrl(transactionHash);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Deposit Certificate #
            {deposit.id.toString()}
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {formatUSDC(deposit.principal)} USDC
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Saving Plan #{deposit.planId.toString()}
          </p>
        </div>

        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-medium',
            getStatusClassName(deposit.status),
          ].join(' ')}
        >
          {getStatusLabel(deposit.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Percent className="h-4 w-4" />

            <p className="text-sm">
              APR at Opening
            </p>
          </div>

          <p className="mt-2 font-semibold text-slate-900">
            {formatBps(deposit.aprBpsAtOpen)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CircleDollarSign className="h-4 w-4" />

            <p className="text-sm">
              Expected Interest
            </p>
          </div>

          <p className="mt-2 font-semibold text-slate-900">
            {formatUSDC(
              deposit.expectedInterest,
            )}{' '}
            USDC
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />

            <p className="text-sm">Opened</p>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatTimestamp(deposit.startAt)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />

            <p className="text-sm">Maturity</p>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatTimestamp(
              deposit.maturityAt,
            )}
          </p>
        </div>
      </div>

      {isActive && blockTimestamp === null && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            Reading the latest blockchain time...
          </p>
        </div>
      )}

      {isActive &&
        blockTimestamp !== null &&
        !isMatured && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

            <p className="text-sm text-amber-800">
              Withdrawing before maturity applies a{' '}
              {formatBps(
                deposit.earlyWithdrawPenaltyBpsAtOpen,
              )}{' '}
              penalty and pays no interest.
            </p>
          </div>
        )}

      {isManualActionAvailable && !isExactGraceDeadline && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />

          <p className="text-sm text-blue-800">
            You can withdraw or manually renew until{' '}
            {formatTimestamp(graceDeadline)}.
            Automatic renewal becomes available at the
            grace deadline.
          </p>
        </div>
      )}

      {isExactGraceDeadline && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />

          <p className="text-sm text-violet-800">
            The grace deadline has been reached. Manual
            actions and automatic renewal are both
            currently eligible. The first confirmed
            transaction determines the result.
          </p>
        </div>
      )}

      {isAfterGracePeriod && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Bot className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />

          <p className="text-sm text-blue-800">
            The grace period has ended. Automatic renewal
            is available and may be processed by the
            automation bot.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {transactionHash &&
        !error &&
        explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-blue-700 underline"
          >
            View transaction on Etherscan
          </a>
        )}

      {confirmationAction && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">
            {confirmationMessage}
          </p>

          {confirmationAction ===
            'renewDeposit' && (
            <div className="mt-4">
              <label
                htmlFor={`renew-plan-${deposit.id.toString()}`}
                className="block text-sm font-medium text-slate-700"
              >
                New Saving Plan
              </label>

              <select
                id={`renew-plan-${deposit.id.toString()}`}
                value={selectedPlanId}
                disabled={
                  isThisDepositSubmitting ||
                  isLoadingPlans ||
                  enabledPlans.length === 0
                }
                onChange={(event) => {
                  setSelectedPlanId(
                    event.target.value,
                  );
                  setPlanSelectionError('');
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enabledPlans.length === 0 ? (
                  <option value="">
                    No enabled saving plans
                  </option>
                ) : (
                  enabledPlans.map((plan) => (
                    <option
                      key={plan.id.toString()}
                      value={plan.id.toString()}
                    >
                      Plan #{plan.id.toString()} —{' '}
                      {plan.tenorDays.toString()} days —{' '}
                      {formatBps(plan.aprBps)}
                    </option>
                  ))
                )}
              </select>

              {isLoadingPlans && (
                <p className="mt-2 text-sm text-slate-500">
                  Loading saving plans...
                </p>
              )}

              {plansError && (
                <p className="mt-2 text-sm text-red-700">
                  {plansError}
                </p>
              )}

              {selectedPlan && (
                <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tenor
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedPlan.tenorDays.toString()}{' '}
                      days
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      APR
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatBps(
                        selectedPlan.aprBps,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Early Penalty
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatBps(
                        selectedPlan.earlyWithdrawPenaltyBps,
                      )}
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500">
                Current plan: #
                {deposit.planId.toString()}. The new
                certificate will use the selected
                plan&apos;s current APR, tenor, and
                penalty.
              </p>

              {planSelectionError && (
                <p className="mt-2 text-sm text-red-700">
                  {planSelectionError}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={isThisDepositSubmitting}
              onClick={closeConfirmation}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                isThisDepositSubmitting ||
                (confirmationAction ===
                  'renewDeposit' &&
                  (isLoadingPlans ||
                    enabledPlans.length === 0 ||
                    !selectedPlanId))
              }
              onClick={() =>
                void executeConfirmedAction()
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isThisDepositSubmitting
                ? getActionLabel(activeAction)
                : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {!confirmationAction && (
        <div className="mt-6 flex flex-wrap gap-3">
          {isActive &&
            blockTimestamp !== null &&
            !isMatured && (
              <button
                type="button"
                disabled={isThisDepositSubmitting}
                onClick={() =>
                  openConfirmation(
                    'earlyWithdraw',
                  )
                }
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Early Withdraw
              </button>
            )}

          {isManualActionAvailable && (
            <>
              <button
                type="button"
                disabled={isThisDepositSubmitting}
                onClick={() =>
                  openConfirmation(
                    'withdrawAtMaturity',
                  )
                }
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Withdraw at Maturity
              </button>

              <button
                type="button"
                disabled={isThisDepositSubmitting}
                onClick={() =>
                  openConfirmation(
                    'renewDeposit',
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Manual Renew
              </button>
            </>
          )}

          <Link
            to={`/deposits/${deposit.id.toString()}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            View Details
          </Link>
        </div>
      )}
    </article>
  );
};
