import {
  AlertTriangle,
  RefreshCw,
  WalletCards,
} from 'lucide-react';

import { SUPPORTED_NETWORK_NAME } from '../blockchain/addresses';
import { LoadingCard } from '../components/LoadingCard';
import { PageHeader } from '../components/PageHeader';
import { PlanCard } from '../components/PlanCard';
import { StateMessage } from '../components/StateMessage';
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
            disabled={
              !canReadBlockchain ||
              isLoading
            }
            onClick={() =>
              void reloadPlans()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                isLoading
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
            />

            {isLoading
              ? 'Loading...'
              : 'Refresh'}
          </button>
        }
      />

      {!isMetaMaskAvailable && (
        <StateMessage
          variant="warning"
          icon={AlertTriangle}
          title="MetaMask is not available"
          description={`Install MetaMask to connect with the ${SUPPORTED_NETWORK_NAME} network.`}
        />
      )}

      {isMetaMaskAvailable &&
        !isConnected && (
          <StateMessage
            icon={WalletCards}
            title="Wallet not connected"
            description="Connect MetaMask to browse available savings plans."
          />
        )}

      {isConnected &&
        isWrongNetwork && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unsupported network"
            description={`Switch MetaMask to ${SUPPORTED_NETWORK_NAME} before loading savings plans.`}
          />
        )}

      {canReadBlockchain &&
        error && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unable to load savings plans"
            description={error}
            action={
              <button
                type="button"
                onClick={() =>
                  void reloadPlans()
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Try Again
              </button>
            }
          />
        )}

      {canReadBlockchain &&
        isLoading &&
        plans.length === 0 && (
          <section className="grid gap-6 xl:grid-cols-2">
            <LoadingCard />
            <LoadingCard />
          </section>
        )}

      {canReadBlockchain &&
        !isLoading &&
        !error &&
        plans.length === 0 && (
          <StateMessage
            title="No savings plans"
            description="No savings plans are currently available."
          />
        )}

      {canReadBlockchain &&
        plans.length > 0 && (
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
