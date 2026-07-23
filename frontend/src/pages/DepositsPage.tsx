import { RefreshCw } from 'lucide-react';

import { DepositCard } from '../components/DepositCard';
import { PageHeader } from '../components/PageHeader';
import { useWalletContext } from '../context/WalletContext';
import { useDeposits } from '../hooks/useDeposits';

export const DepositsPage = () => {
  const {
    isConnected,
    isWrongNetwork,
    isMetaMaskAvailable,
  } = useWalletContext();

  const {
    deposits,
    isLoading,
    error,
    reloadDeposits,
  } = useDeposits();

  const canReadBlockchain =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Deposits"
        description="Track your active, matured, withdrawn, and renewed deposits."
        action={
          <button
            type="button"
            disabled={!canReadBlockchain || isLoading}
            onClick={() => void reloadDeposits()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                isLoading ? 'animate-spin' : '',
              ].join(' ')}
            />

            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        }
      />

      {!isMetaMaskAvailable && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">
            Install MetaMask to view your deposits.
          </p>
        </section>
      )}

      {isConnected && isWrongNetwork && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            Switch MetaMask to Sepolia before loading deposits.
          </p>
        </section>
      )}

      {!canReadBlockchain && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Connect MetaMask on Sepolia to view your deposits.
          </p>
        </section>
      )}

      {canReadBlockchain && error && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            Unable to load deposits from SavingCore.
          </p>
        </section>
      )}

      {canReadBlockchain &&
        isLoading &&
        deposits.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading your deposits...
            </p>
          </section>
        )}

      {canReadBlockchain &&
        !isLoading &&
        !error &&
        deposits.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No deposits yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Open a saving plan to create your first term deposit.
            </p>
          </section>
        )}

      {canReadBlockchain && deposits.length > 0 && (
        <section className="space-y-5">
          {deposits.map((deposit) => (
            <DepositCard
              key={deposit.id.toString()}
              deposit={deposit}
              onActionCompleted={() => {
                void reloadDeposits();
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
};
