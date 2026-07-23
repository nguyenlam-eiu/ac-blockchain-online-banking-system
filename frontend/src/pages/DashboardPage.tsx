import { CircleDollarSign, Landmark, PiggyBank, RefreshCw, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import { SUPPORTED_NETWORK_NAME } from "../blockchain/addresses";
import { formatAddress } from "../blockchain/format";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { useWalletContext } from "../context/WalletContext";
import { useUsdcBalance } from "../hooks/useUsdcBalance";
import { usePendingInterest } from "../hooks/usePendingInterest";
import { useSystemStatus } from "../hooks/useSystemStatus";
import { useDepositSummary } from "../hooks/useDepositSummary";

export const DashboardPage = () => {
  const { account, isConnected, isWrongNetwork, isMetaMaskAvailable } = useWalletContext();

  const { formattedBalance, isLoading: isBalanceLoading, error: balanceError, reloadBalance } = useUsdcBalance();

  const {
    formattedPendingInterest,
    isLoading: isPendingInterestLoading,
    error: pendingInterestError,
    reloadPendingInterest,
  } = usePendingInterest();

  const canReadBlockchain = isMetaMaskAvailable && isConnected && !isWrongNetwork;

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

  const handleRefresh = async () => {
    await Promise.all([reloadBalance(), reloadPendingInterest(), reloadSystemStatus(), reloadDepositSummary()]);
  };

  const isRefreshing = isBalanceLoading || isPendingInterestLoading || isSystemStatusLoading || isDepositSummaryLoading;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Review your savings portfolio and account activity."
        action={
          <button
            type="button"
            disabled={!canReadBlockchain || isRefreshing}
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={["h-4 w-4", isRefreshing ? "animate-spin" : ""].join(" ")} />

            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      {!isMetaMaskAvailable && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">Install MetaMask to access blockchain banking features.</p>
        </section>
      )}

      {isConnected && isWrongNetwork && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">Switch MetaMask to {SUPPORTED_NETWORK_NAME} before loading account data.</p>
        </section>
      )}

      {canReadBlockchain && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-medium text-emerald-800">
            Wallet {formatAddress(account)} is connected to {SUPPORTED_NETWORK_NAME}.
          </p>
        </section>
      )}

      {canReadBlockchain && balanceError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">
            MockUSDC data is unavailable because the contract address has not been configured yet.
          </p>
        </section>
      )}

      {canReadBlockchain && !systemStatusError && (
        <section
          className={[
            "rounded-xl border px-5 py-4",
            isPaused ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50",
          ].join(" ")}
        >
          <p className={["text-sm font-medium", isPaused ? "text-red-700" : "text-emerald-800"].join(" ")}>
            {isSystemStatusLoading
              ? "Loading system status..."
              : isPaused
              ? "The banking system is currently paused."
              : "The banking system is active."}
          </p>
        </section>
      )}

      {canReadBlockchain && systemStatusError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">Unable to load the banking system status.</p>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MockUSDC Balance"
          value={!canReadBlockchain ? "—" : isBalanceLoading ? "Loading..." : `${formattedBalance} USDC`}
          helperText={
            !canReadBlockchain
              ? `Connect MetaMask on ${SUPPORTED_NETWORK_NAME}.`
              : balanceError
              ? "MockUSDC contract is not configured yet."
              : "Available balance in your connected wallet."
          }
          icon={WalletCards}
        />

        <StatCard
          label="Total Deposited"
          value={!canReadBlockchain ? "—" : isDepositSummaryLoading ? "Loading..." : `${formattedTotalDeposited} USDC`}
          helperText={
            !canReadBlockchain
              ? "Wallet connection is required."
              : depositSummaryError
              ? "Unable to load deposited principal."
              : "Principal across your active deposits."
          }
          icon={Landmark}
        />

        <StatCard
          label="Active Deposits"
          value={!canReadBlockchain ? "—" : isDepositSummaryLoading ? "Loading..." : activeDepositCount.toString()}
          helperText={
            !canReadBlockchain
              ? "Wallet connection is required."
              : depositSummaryError
              ? "Unable to load active deposits."
              : "Deposits currently earning interest."
          }
          icon={PiggyBank}
        />

        <StatCard
          label="Pending Interest"
          value={
            !canReadBlockchain ? "—" : isPendingInterestLoading ? "Loading..." : `${formattedPendingInterest} USDC`
          }
          helperText={
            !canReadBlockchain
              ? "Wallet connection is required."
              : pendingInterestError
              ? "Unable to load pending interest."
              : "Interest available to claim."
          }
          icon={CircleDollarSign}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Savings plans</p>

          <h2 className="mt-2 text-lg font-semibold text-slate-900">Explore available term deposits</h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review tenor, APR, deposit limits, and early withdrawal conditions.
          </p>

          <Link to="/plans" className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            View savings plans
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Deposit portfolio</p>

          <h2 className="mt-2 text-lg font-semibold text-slate-900">Track your active deposits</h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review maturity dates, expected interest, and withdrawal availability.
          </p>

          <Link to="/deposits" className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
            View my deposits
          </Link>
        </article>
      </section>
    </div>
  );
};
