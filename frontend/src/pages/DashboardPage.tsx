import {
  AlertTriangle,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getTxExplorerUrl,
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import {
  formatAddress,
  formatUSDC,
} from '../blockchain/format';
import { PageHeader } from '../components/PageHeader';
import { StateMessage } from '../components/StateMessage';
import { StatCard } from '../components/StatCard';
import { useWalletContext } from '../context/WalletContext';
import { useClaimPendingInterest } from '../hooks/useClaimPendingInterest';
import { useDepositSummary } from '../hooks/useDepositSummary';
import { usePendingInterest } from '../hooks/usePendingInterest';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useUsdcBalance } from '../hooks/useUsdcBalance';

export const DashboardPage = () => {
  const {
    account,
    isConnected,
    isWrongNetwork,
    isMetaMaskAvailable,
  } = useWalletContext();

  const [isClaimConfirmationOpen, setIsClaimConfirmationOpen] =
    useState(false);

  const {
    formattedBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
    reloadBalance,
  } = useUsdcBalance();

  const {
    pendingInterest,
    formattedPendingInterest,
    isLoading: isPendingInterestLoading,
    error: pendingInterestError,
    reloadPendingInterest,
  } = usePendingInterest();

  const {
    isPaused,
    isLoading: isSystemStatusLoading,
    error: systemStatusError,
    reloadSystemStatus,
  } = useSystemStatus();

  const {
    formattedTotalDeposited,
    activeDepositCount,
    isLoading: isDepositSummaryLoading,
    error: depositSummaryError,
    reloadDepositSummary,
  } = useDepositSummary();

  const {
    isSubmitting: isClaimSubmitting,
    transactionHash: claimTransactionHash,
    error: claimError,
    claimPendingInterest,
    clearClaimPendingInterestState,
  } = useClaimPendingInterest();

  const canReadBlockchain =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  const hasPendingInterest =
    pendingInterest > 0n;

  const handleRefresh = async () => {
    await Promise.all([
      reloadBalance(),
      reloadPendingInterest(),
      reloadSystemStatus(),
      reloadDepositSummary(),
    ]);
  };

  const handleClaimPendingInterest = async () => {
    clearClaimPendingInterestState();

    const success =
      await claimPendingInterest();

    if (!success) {
      return;
    }

    setIsClaimConfirmationOpen(false);

    await Promise.all([
      reloadBalance(),
      reloadPendingInterest(),
      reloadDepositSummary(),
    ]);
  };

  const isRefreshing =
    isBalanceLoading ||
    isPendingInterestLoading ||
    isSystemStatusLoading ||
    isDepositSummaryLoading;

  const dashboardError =
    balanceError ||
    pendingInterestError ||
    depositSummaryError;

  const claimExplorerUrl =
    getTxExplorerUrl(
      claimTransactionHash,
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor your wallet balance, savings deposits, pending interest, and system status."
        action={
          <button
            type="button"
            disabled={
              !canReadBlockchain ||
              isRefreshing ||
              isClaimSubmitting
            }
            onClick={() =>
              void handleRefresh()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                isRefreshing
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
            />

            {isRefreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        }
      />

      {!isMetaMaskAvailable && (
        <StateMessage
          variant="warning"
          icon={AlertTriangle}
          title="MetaMask is not available"
          description="Install MetaMask to access blockchain banking features."
        />
      )}

      {isMetaMaskAvailable &&
        !isConnected && (
          <StateMessage
            icon={WalletCards}
            title="Wallet not connected"
            description="Connect MetaMask to view your account dashboard."
          />
        )}

      {isConnected &&
        isWrongNetwork && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unsupported network"
            description={`Switch MetaMask to ${SUPPORTED_NETWORK_NAME} before loading account data.`}
          />
        )}

      {canReadBlockchain && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-800">
            Wallet{' '}
            <span className="font-semibold">
              {formatAddress(account)}
            </span>{' '}
            is connected to{' '}
            {SUPPORTED_NETWORK_NAME}.
          </p>
        </div>
      )}

      {canReadBlockchain &&
        dashboardError && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Some dashboard data is unavailable"
            description={dashboardError}
            action={
              <button
                type="button"
                onClick={() =>
                  void handleRefresh()
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Try Again
              </button>
            }
          />
        )}

      {canReadBlockchain &&
        !systemStatusError && (
          <div
            className={[
              'rounded-xl border px-5 py-4',
              isPaused
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50',
            ].join(' ')}
          >
            <p
              className={[
                'text-sm font-medium',
                isPaused
                  ? 'text-amber-800'
                  : 'text-emerald-800',
              ].join(' ')}
            >
              {isSystemStatusLoading
                ? 'Loading system status...'
                : isPaused
                  ? 'The banking system is currently paused.'
                  : 'The banking system is active.'}
            </p>
          </div>
        )}

      {canReadBlockchain &&
        systemStatusError && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unable to load system status"
            description={systemStatusError}
          />
        )}

      {canReadBlockchain && (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="MockUSDC Balance"
            value={
              isBalanceLoading
                ? 'Loading...'
                : `${formattedBalance} USDC`
            }
            helperText="Available wallet balance"
            icon={CircleDollarSign}
          />

          <StatCard
            label="Deposited Principal"
            value={
              isDepositSummaryLoading
                ? 'Loading...'
                : `${formattedTotalDeposited} USDC`
            }
            helperText="Principal across owned certificates"
            icon={Landmark}
          />

          <StatCard
            label="Active Deposits"
            value={
              isDepositSummaryLoading
                ? 'Loading...'
                : activeDepositCount.toString()
            }
            helperText="Currently active certificates"
            icon={PiggyBank}
          />

          <StatCard
            label="Pending Interest"
            value={
              isPendingInterestLoading
                ? 'Loading...'
                : `${formattedPendingInterest} USDC`
            }
            helperText={
              hasPendingInterest
                ? 'Deferred interest available to claim'
                : 'No deferred interest'
            }
            icon={WalletCards}
          />
        </section>
      )}

      {canReadBlockchain &&
        hasPendingInterest && (
          <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  C1 Principal Safety Recovery
                </p>

                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Claim Pending Interest
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  You have{' '}
                  <span className="font-semibold text-slate-900">
                    {formatUSDC(
                      pendingInterest,
                    )}{' '}
                    USDC
                  </span>{' '}
                  in deferred interest. The claim succeeds only when the
                  interest vault has enough available liquidity.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isClaimSubmitting ||
                  isPaused
                }
                onClick={() => {
                  clearClaimPendingInterestState();
                  setIsClaimConfirmationOpen(true);
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isClaimSubmitting
                  ? 'Claiming...'
                  : 'Claim Pending Interest'}
              </button>
            </div>

            {isPaused && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">
                  Pending interest cannot be claimed while the banking
                  system is paused.
                </p>
              </div>
            )}

            {claimError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">
                  {claimError}
                </p>
              </div>
            )}

            {claimTransactionHash &&
              !claimError && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm text-emerald-800">
                    Pending interest claim confirmed successfully.
                  </p>

                  {claimExplorerUrl && (
                    <a
                      href={claimExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-medium text-emerald-800 underline"
                    >
                      View transaction on Etherscan
                    </a>
                  )}
                </div>
              )}
          </section>
        )}

      {isClaimConfirmationOpen && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Confirm Pending Interest Claim
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Claim{' '}
            <span className="font-semibold text-slate-900">
              {formattedPendingInterest} USDC
            </span>{' '}
            from the interest vault? The transaction will revert if the
            vault does not currently have sufficient liquidity.
          </p>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={isClaimSubmitting}
              onClick={() => {
                setIsClaimConfirmationOpen(false);
                clearClaimPendingInterestState();
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isClaimSubmitting}
              onClick={() =>
                void handleClaimPendingInterest()
              }
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClaimSubmitting
                ? 'Claiming Interest...'
                : 'Confirm Claim'}
            </button>
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Savings Plans
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Explore available term deposits
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review tenor, APR, deposit limits, and early withdrawal
            conditions.
          </p>

          <Link
            to="/plans"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            View Savings Plans
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Deposit Portfolio
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Track your active deposits
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review maturity dates, expected interest, certificate status,
            and available withdrawal actions.
          </p>

          <Link
            to="/deposits"
            className="mt-5 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View My Deposits
          </Link>
        </article>
      </section>
    </div>
  );
};
