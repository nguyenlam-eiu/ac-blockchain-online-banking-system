import {
  CalendarDays,
  CircleDollarSign,
  Percent,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import {
  formatBps,
  formatTimestamp,
  formatUSDC,
} from '../blockchain/format';
import {
  DEPOSIT_STATUS,
  type UserDeposit,
} from '../hooks/useDeposits';
import {
  type DepositAction,
  useDepositActions,
} from '../hooks/useDepositActions';

type DepositCardProps = {
  deposit: UserDeposit;
  onActionCompleted: () => void;
};

const getStatusLabel = (
  status: bigint,
): string => {
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
  if (action === 'earlyWithdraw') {
    return 'Withdrawing...';
  }

  if (action === 'withdrawAtMaturity') {
    return 'Withdrawing...';
  }

  if (action === 'renewDeposit') {
    return 'Renewing...';
  }

  return 'Processing...';
};

export const DepositCard = ({
  deposit,
  onActionCompleted,
}: DepositCardProps) => {
  const [confirmationAction, setConfirmationAction] =
    useState<DepositAction | null>(null);

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

  const nowInSeconds = BigInt(
    Math.floor(Date.now() / 1000),
  );

  const isActive =
    deposit.status === DEPOSIT_STATUS.active;

  const isMatured =
    isActive && nowInSeconds >= deposit.maturityAt;

  const isThisDepositSubmitting =
    isSubmitting &&
    activeDepositId === deposit.id;

  const handleConfirmedAction = async () => {
    if (!confirmationAction) {
      return;
    }

    clearDepositActionState();

    const success =
      confirmationAction === 'earlyWithdraw'
        ? await earlyWithdraw(deposit.id)
        : confirmationAction === 'withdrawAtMaturity'
          ? await withdrawAtMaturity(deposit.id)
          : await renewDeposit(deposit.id);

    if (success) {
      setConfirmationAction(null);
      onActionCompleted();
    }
  };

  const confirmationMessage =
    confirmationAction === 'earlyWithdraw'
      ? `Early withdrawal applies a ${formatBps(
          deposit.earlyWithdrawPenaltyBpsAtOpen,
        )} penalty. Continue?`
      : confirmationAction === 'withdrawAtMaturity'
        ? 'Withdraw the principal and available interest from this matured deposit?'
        : 'Renew this deposit into a new term using the same principal?';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Deposit Certificate #{deposit.id.toString()}
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
            <p className="text-sm">APR at Opening</p>
          </div>

          <p className="mt-2 font-semibold text-slate-900">
            {formatBps(deposit.aprBpsAtOpen)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CircleDollarSign className="h-4 w-4" />
            <p className="text-sm">Expected Interest</p>
          </div>

          <p className="mt-2 font-semibold text-slate-900">
            {formatUSDC(deposit.expectedInterest)} USDC
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
            {formatTimestamp(deposit.maturityAt)}
          </p>
        </div>
      </div>

      {isActive && !isMatured && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

          <p className="text-sm text-amber-800">
            Withdrawing before maturity applies a{' '}
            {formatBps(
              deposit.earlyWithdrawPenaltyBpsAtOpen,
            )}{' '}
            penalty.
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

      {transactionHash && !error && (
        <a
          href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-blue-700 underline"
        >
          View latest transaction on Etherscan
        </a>
      )}

      {confirmationAction && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">
            {confirmationMessage}
          </p>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={isThisDepositSubmitting}
              onClick={() => {
                setConfirmationAction(null);
                clearDepositActionState();
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isThisDepositSubmitting}
              onClick={() => void handleConfirmedAction()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isThisDepositSubmitting
                ? getActionLabel(activeAction)
                : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {isActive && !confirmationAction && (
        <div className="mt-6 flex flex-wrap gap-3">
          {!isMatured && (
            <button
              type="button"
              disabled={isThisDepositSubmitting}
              onClick={() =>
                setConfirmationAction('earlyWithdraw')
              }
              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Early Withdraw
            </button>
          )}

          {isMatured && (
            <>
              <button
                type="button"
                disabled={isThisDepositSubmitting}
                onClick={() =>
                  setConfirmationAction(
                    'withdrawAtMaturity',
                  )
                }
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Withdraw at Maturity
              </button>

              <button
                type="button"
                disabled={isThisDepositSubmitting}
                onClick={() =>
                  setConfirmationAction('renewDeposit')
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Renew Deposit
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
};
