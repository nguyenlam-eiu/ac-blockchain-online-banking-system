import { useMemo, useState } from 'react';

import {
  formatUSDC,
  parseUSDC,
} from '../blockchain/format';
import { useOpenDeposit } from '../hooks/useOpenDeposit';
import type { SavingPlan } from '../hooks/usePlans';

type OpenDepositFormProps = {
  plan: SavingPlan;
  onCancel: () => void;
  onSuccess: () => void;
};

export const OpenDepositForm = ({
  plan,
  onCancel,
  onSuccess,
}: OpenDepositFormProps) => {
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] =
    useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    isApproving,
    isOpeningDeposit,
    error: transactionError,
    transactionHash,
    openDeposit,
    clearOpenDepositState,
  } = useOpenDeposit();

  const amountLimits = useMemo(
    () => ({
      minimum: formatUSDC(plan.minDeposit),
      maximum: formatUSDC(plan.maxDeposit),
    }),
    [plan.maxDeposit, plan.minDeposit],
  );

  const isSubmitting =
    isApproving || isOpeningDeposit;

  const validateAmount = (): bigint | null => {
    const normalizedAmount = amount.trim();

    if (!normalizedAmount) {
      setValidationError('Enter a deposit amount.');
      return null;
    }

    let parsedAmount: bigint;

    try {
      parsedAmount = parseUSDC(normalizedAmount);
    } catch {
      setValidationError(
        'Enter a valid USDC amount with up to 6 decimals.',
      );
      return null;
    }

    if (parsedAmount < plan.minDeposit) {
      setValidationError(
        `The minimum deposit is ${amountLimits.minimum} USDC.`,
      );
      return null;
    }

    if (parsedAmount > plan.maxDeposit) {
      setValidationError(
        `The maximum deposit is ${amountLimits.maximum} USDC.`,
      );
      return null;
    }

    setValidationError('');
    return parsedAmount;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const parsedAmount = validateAmount();

    if (parsedAmount === null) {
      return;
    }

    setIsSuccess(false);
    clearOpenDepositState();

    const success = await openDeposit(
      plan.id,
      parsedAmount,
    );

    if (success) {
      setIsSuccess(true);
      setAmount('');
      onSuccess();
    }
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    clearOpenDepositState();
    onCancel();
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5"
    >
      <div>
        <label
          htmlFor={`deposit-amount-${plan.id.toString()}`}
          className="text-sm font-medium text-slate-700"
        >
          Deposit amount
        </label>

        <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            id={`deposit-amount-${plan.id.toString()}`}
            type="text"
            inputMode="decimal"
            value={amount}
            disabled={isSubmitting}
            onChange={(event) => {
              setAmount(event.target.value);
              setValidationError('');
              setIsSuccess(false);
              clearOpenDepositState();
            }}
            placeholder="Enter amount"
            className="min-w-0 flex-1 border-0 px-3 py-2.5 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
            USDC
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Minimum {amountLimits.minimum} USDC · Maximum{' '}
          {amountLimits.maximum} USDC
        </p>

        {validationError && (
          <p className="mt-2 text-sm text-red-600">
            {validationError}
          </p>
        )}

        {transactionError && (
          <p className="mt-2 text-sm text-red-600">
            {transactionError}
          </p>
        )}

        {isSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-medium text-emerald-800">
              Deposit opened successfully.
            </p>

            {transactionHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-xs font-medium text-emerald-700 underline"
              >
                View transaction on Etherscan
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !plan.enabled}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApproving
            ? 'Approving USDC...'
            : isOpeningDeposit
              ? 'Opening deposit...'
              : 'Confirm Deposit'}
        </button>
      </div>
    </form>
  );
};
