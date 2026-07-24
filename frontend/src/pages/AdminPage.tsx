import {
  AlertTriangle,
  CircleDollarSign,
  LockKeyhole,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

import {
  getTxExplorerUrl,
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import {
  formatAddress,
  formatBps,
  formatUSDC,
} from '../blockchain/format';
import { PageHeader } from '../components/PageHeader';
import { StateMessage } from '../components/StateMessage';
import { StatCard } from '../components/StatCard';
import { useWalletContext } from '../context/WalletContext';
import {
  type CreatePlanInput,
  useAdminActions,
} from '../hooks/useAdminActions';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

const EMPTY_PLAN: CreatePlanInput = {
  tenorDays: '',
  aprBps: '',
  minDeposit: '',
  maxDeposit: '',
  penaltyBps: '',
};

const FEE_RECEIVER_NAME_PREFIX =
  'online-banking:fee-receiver-name:';

const getFeeReceiverNameKey = (
  address: string,
) =>
  `${FEE_RECEIVER_NAME_PREFIX}${address.toLowerCase()}`;

const readFeeReceiverName = (
  address: string,
): string => {
  if (!address) {
    return '';
  }

  return (
    window.localStorage.getItem(
      getFeeReceiverNameKey(address),
    ) ?? ''
  );
};

const saveFeeReceiverName = (
  address: string,
  name: string,
) => {
  if (!address) {
    return;
  }

  const key =
    getFeeReceiverNameKey(address);
  const normalizedName = name.trim();

  if (normalizedName) {
    window.localStorage.setItem(
      key,
      normalizedName,
    );
    return;
  }

  window.localStorage.removeItem(key);
};

export const AdminPage = () => {
  const {
    isMetaMaskAvailable,
    isConnected,
    isWrongNetwork,
  } = useWalletContext();

  const {
    owner,
    feeReceiver: currentFeeReceiver,
    isOwner,
    isPaused,
    vaultBalance,
    totalPromisedInterest,
    excessLiquidity,
    plans,
    isLoading,
    error,
    reloadAdminDashboard,
  } = useAdminDashboard();

  const {
    activeAction,
    transactionHash,
    error: actionError,
    isSubmitting,
    fundVault,
    withdrawVault,
    pauseSystem,
    unpauseSystem,
    createPlan,
    updatePlanApr,
    setPlanEnabled,
    setFeeReceiver,
    clearAdminActionState,
  } = useAdminActions();

  const [fundAmount, setFundAmount] =
    useState('');
  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState('');
  const [
    feeReceiver,
    setFeeReceiverInput,
  ] = useState('');
  const [
    feeReceiverName,
    setFeeReceiverName,
  ] = useState('');
  const [planInput, setPlanInput] =
    useState<CreatePlanInput>(
      EMPTY_PLAN,
    );
  const [
    updatePlanId,
    setUpdatePlanId,
  ] = useState('');
  const [updateApr, setUpdateApr] =
    useState('');

  useEffect(() => {
    setFeeReceiverName(
      readFeeReceiverName(
        currentFeeReceiver,
      ),
    );
  }, [currentFeeReceiver]);

  const canRead =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  const runAndRefresh = async (
    action: Promise<boolean>,
    clear?: () => void,
  ) => {
    clearAdminActionState();

    const success = await action;

    if (success) {
      clear?.();
      await reloadAdminDashboard();
    }
  };

  const explorerUrl =
    getTxExplorerUrl(
      transactionHash,
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Administration"
        description="Manage saving plans, vault liquidity, solvency obligations, and system availability."
        action={
          <button
            type="button"
            disabled={
              !canRead ||
              isLoading ||
              isSubmitting
            }
            onClick={() =>
              void reloadAdminDashboard()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                isLoading
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
            />
            Refresh
          </button>
        }
      />

      {!isMetaMaskAvailable && (
        <StateMessage
          variant="warning"
          icon={AlertTriangle}
          title="MetaMask is not available"
          description="Install MetaMask to access owner controls."
        />
      )}

      {isMetaMaskAvailable &&
        !isConnected && (
          <StateMessage
            icon={WalletCards}
            title="Wallet not connected"
            description="Connect the contract owner wallet."
          />
        )}

      {isConnected &&
        isWrongNetwork && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unsupported network"
            description={`Switch MetaMask to ${SUPPORTED_NETWORK_NAME}.`}
          />
        )}

      {canRead && error && (
        <StateMessage
          variant="error"
          icon={AlertTriangle}
          title="Unable to load administration data"
          description={error}
        />
      )}

      {canRead &&
        !isLoading &&
        !error &&
        !isOwner && (
          <StateMessage
            variant="warning"
            icon={LockKeyhole}
            title="Owner access required"
            description={`The VaultManager owner is ${formatAddress(
              owner,
            )}. Connect that wallet to use administrative controls.`}
          />
        )}

      {canRead && isOwner && (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm font-medium">
                Owner wallet verified:
                {' '}
                {formatAddress(owner)}
              </p>
            </div>
          </div>

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Vault Balance"
              value={`${formatUSDC(
                vaultBalance,
              )} USDC`}
              helperText="Current interest reserve"
              icon={CircleDollarSign}
            />
            <StatCard
              label="Promised Interest"
              value={`${formatUSDC(
                totalPromisedInterest,
              )} USDC`}
              helperText="C2 active liabilities"
              icon={ShieldCheck}
            />
            <StatCard
              label="Excess Liquidity"
              value={`${formatUSDC(
                excessLiquidity,
              )} USDC`}
              helperText="Maximum safely withdrawable"
              icon={WalletCards}
            />
            <StatCard
              label="System Status"
              value={
                isPaused
                  ? 'Paused'
                  : 'Active'
              }
              helperText="VaultManager pause state"
              icon={
                isPaused
                  ? PauseCircle
                  : PlayCircle
              }
            />
          </section>

          {actionError && (
            <StateMessage
              variant="error"
              icon={AlertTriangle}
              title="Administrative transaction failed"
              description={actionError}
            />
          )}

          {transactionHash &&
            !actionError && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-800">
                  Administrative transaction confirmed.
                </p>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-emerald-800 underline"
                  >
                    View transaction on Etherscan
                  </a>
                )}
              </div>
            )}

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Vault Liquidity
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Funding requires MockUSDC approval. Withdrawals cannot reduce the vault below promised interest.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Fund amount (USDC)
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      value={fundAmount}
                      onChange={(event) =>
                        setFundAmount(
                          event.target.value,
                        )
                      }
                      placeholder="1000"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        void runAndRefresh(
                          fundVault(
                            fundAmount,
                          ),
                          () =>
                            setFundAmount(
                              '',
                            ),
                        )
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {activeAction ===
                      'fundVault'
                        ? 'Funding...'
                        : 'Fund Vault'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Withdraw amount (USDC)
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      value={withdrawAmount}
                      onChange={(event) =>
                        setWithdrawAmount(
                          event.target.value,
                        )
                      }
                      placeholder="100"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        void runAndRefresh(
                          withdrawVault(
                            withdrawAmount,
                          ),
                          () =>
                            setWithdrawAmount(
                              '',
                            ),
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {activeAction ===
                      'withdrawVault'
                        ? 'Withdrawing...'
                        : 'Withdraw Excess'}
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                System Controls
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Pausing blocks deposits, withdrawals, renewals, vault funding, interest payments, and pending-interest claims.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {isPaused ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      void runAndRefresh(
                        unpauseSystem(),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {activeAction ===
                    'unpause'
                      ? 'Unpausing...'
                      : 'Unpause System'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      void runAndRefresh(
                        pauseSystem(),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <PauseCircle className="h-4 w-4" />
                    {activeAction ===
                    'pause'
                      ? 'Pausing...'
                      : 'Pause System'}
                  </button>
                )}
              </div>

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current Penalty Receiver
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {feeReceiverName ||
                    'Unnamed Receiver'}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">
                  {currentFeeReceiver}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  The address is stored on-chain. The display name is saved only in this browser because the smart contract stores no receiver name.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Penalty receiver name
                  <input
                    value={feeReceiverName}
                    onChange={(event) =>
                      setFeeReceiverName(
                        event.target.value,
                      )
                    }
                    placeholder="Bank Treasury"
                    maxLength={80}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Fee receiver address
                  <input
                    value={feeReceiver}
                    onChange={(event) =>
                      setFeeReceiverInput(
                        event.target.value,
                      )
                    }
                    placeholder={
                      currentFeeReceiver ||
                      '0x...'
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={
                      isSubmitting ||
                      !feeReceiver.trim()
                    }
                    onClick={() => {
                      const nextAddress =
                        feeReceiver.trim();
                      const nextName =
                        feeReceiverName.trim();

                      void runAndRefresh(
                        setFeeReceiver(
                          nextAddress,
                        ),
                        () => {
                          saveFeeReceiverName(
                            nextAddress,
                            nextName,
                          );
                          setFeeReceiverInput(
                            '',
                          );
                        },
                      );
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {activeAction ===
                    'setFeeReceiver'
                      ? 'Updating...'
                      : 'Update Receiver'}
                  </button>

                  <button
                    type="button"
                    disabled={
                      isSubmitting ||
                      !currentFeeReceiver
                    }
                    onClick={() => {
                      saveFeeReceiverName(
                        currentFeeReceiver,
                        feeReceiverName,
                      );
                      setFeeReceiverName(
                        readFeeReceiverName(
                          currentFeeReceiver,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                  >
                    Save Display Name
                  </button>
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">
                Create Saving Plan
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ['tenorDays', 'Tenor days', '90'],
                ['aprBps', 'APR BPS', '225'],
                ['minDeposit', 'Minimum USDC', '1'],
                ['maxDeposit', 'Maximum USDC', '1000000'],
                ['penaltyBps', 'Penalty BPS', '400'],
              ].map(
                ([key, label, placeholder]) => (
                  <label
                    key={key}
                    className="text-sm font-medium text-slate-700"
                  >
                    {label}
                    <input
                      value={
                        planInput[
                          key as keyof CreatePlanInput
                        ]
                      }
                      onChange={(event) =>
                        setPlanInput(
                          (current) => ({
                            ...current,
                            [key]:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder={placeholder}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>
                ),
              )}
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                void runAndRefresh(
                  createPlan(planInput),
                  () =>
                    setPlanInput(
                      EMPTY_PLAN,
                    ),
                )
              }
              className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {activeAction ===
              'createPlan'
                ? 'Creating Plan...'
                : 'Create Plan'}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Update Plan APR
            </h2>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                value={updatePlanId}
                onChange={(event) =>
                  setUpdatePlanId(
                    event.target.value,
                  )
                }
                placeholder="Plan ID"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                value={updateApr}
                onChange={(event) =>
                  setUpdateApr(
                    event.target.value,
                  )
                }
                placeholder="New APR BPS"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  void runAndRefresh(
                    updatePlanApr(
                      updatePlanId,
                      updateApr,
                    ),
                    () => {
                      setUpdatePlanId('');
                      setUpdateApr('');
                    },
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Update APR
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Existing Plans
            </h2>

            {plans.map((plan) => (
              <article
                key={plan.id.toString()}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Plan #{plan.id.toString()}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {plan.tenorDays.toString()} days ·{' '}
                      {formatBps(
                        plan.aprBps,
                      )} APR ·{' '}
                      {formatBps(
                        plan.earlyWithdrawPenaltyBps,
                      )} penalty
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Min {formatUSDC(
                        plan.minDeposit,
                      )} USDC · Max{' '}
                      {plan.maxDeposit === 0n
                        ? 'Unlimited'
                        : `${formatUSDC(
                            plan.maxDeposit,
                          )} USDC`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      void runAndRefresh(
                        setPlanEnabled(
                          plan.id,
                          !plan.enabled,
                        ),
                      )
                    }
                    className={[
                      'rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50',
                      plan.enabled
                        ? 'border border-red-200 bg-red-50 text-red-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
                    ].join(' ')}
                  >
                    {plan.enabled
                      ? 'Disable'
                      : 'Enable'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
};
