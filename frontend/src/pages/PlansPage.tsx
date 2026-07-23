import { RefreshCw } from 'lucide-react';

import { PageHeader } from '../components/PageHeader';
import { PlanCard } from '../components/PlanCard';
import { useWalletContext } from '../context/WalletContext';
import { usePlans } from '../hooks/usePlans';

export const PlansPage = () => {
  const {
    isConnected,
    isWrongNetwork,
    isMetaMaskAvailable,
  } = useWalletContext();

  const {
    plans,
    isLoading,
    error,
    reloadPlans,
  } = usePlans();

  const canReadBlockchain =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Savings Plans"
        description="Browse available term deposit plans and review their conditions."
        action={
          <button
            type="button"
            disabled={!canReadBlockchain || isLoading}
            onClick={() => void reloadPlans()}
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
            Install MetaMask to view saving plans.
          </p>
        </section>
      )}

      {isConnected && isWrongNetwork && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            Switch MetaMask to Sepolia before loading saving plans.
          </p>
        </section>
      )}

      {canReadBlockchain && error && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            Unable to load saving plans from SavingCore.
          </p>
        </section>
      )}

      {!canReadBlockchain && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Connect MetaMask on Sepolia to view available saving plans.
          </p>
        </section>
      )}

      {canReadBlockchain &&
        isLoading &&
        plans.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading saving plans...
            </p>
          </section>
        )}

      {canReadBlockchain &&
        !isLoading &&
        !error &&
        plans.length === 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              No saving plans are currently available.
            </p>
          </section>
        )}

      {canReadBlockchain && plans.length > 0 && (
        <section className="grid gap-6 xl:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id.toString()}
              plan={plan}
              onDepositOpened={() => {
                void reloadPlans();
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
};
