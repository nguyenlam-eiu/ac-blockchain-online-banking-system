import {
  AlertTriangle,
  Landmark,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import { SUPPORTED_NETWORK_NAME } from '../blockchain/addresses';
import { DepositCard } from '../components/DepositCard';
import { LoadingCard } from '../components/LoadingCard';
import { PageHeader } from '../components/PageHeader';
import { StateMessage } from '../components/StateMessage';
import { useWalletContext } from '../context/WalletContext';
import { useDeposits } from '../hooks/useDeposits';

export const DepositsPage = () => {
  const {
    provider,
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

  const [blockTimestamp, setBlockTimestamp] =
    useState<bigint | null>(null);

  const [
    isLoadingBlockTimestamp,
    setIsLoadingBlockTimestamp,
  ] = useState(false);

  const [blockTimestampError, setBlockTimestampError] =
    useState('');

  const canReadBlockchain =
    isMetaMaskAvailable &&
    isConnected &&
    !isWrongNetwork;

  const loadBlockTimestamp = useCallback(async () => {
    if (!provider || !canReadBlockchain) {
      setBlockTimestamp(null);
      setBlockTimestampError('');
      return;
    }

    setIsLoadingBlockTimestamp(true);
    setBlockTimestampError('');

    try {
      const latestBlock =
        await provider.getBlock('latest');

      if (!latestBlock) {
        throw new Error(
          'Unable to read the latest blockchain block.',
        );
      }

      setBlockTimestamp(
        BigInt(latestBlock.timestamp),
      );
    } catch (error) {
      setBlockTimestamp(null);
      setBlockTimestampError(
        error instanceof Error
          ? error.message
          : 'Unable to read blockchain time.',
      );
    } finally {
      setIsLoadingBlockTimestamp(false);
    }
  }, [provider, canReadBlockchain]);

  const reloadPageData = useCallback(async () => {
    await Promise.all([
      reloadDeposits(),
      loadBlockTimestamp(),
    ]);
  }, [reloadDeposits, loadBlockTimestamp]);

  useEffect(() => {
    void loadBlockTimestamp();
  }, [loadBlockTimestamp]);

  const pageError =
    error || blockTimestampError;

  const isRefreshing =
    isLoading || isLoadingBlockTimestamp;

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Deposits"
        description="Track your active, matured, withdrawn, and renewed deposits."
        action={
          <button
            type="button"
            disabled={
              !canReadBlockchain ||
              isRefreshing
            }
            onClick={() =>
              void reloadPageData()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          description="Install MetaMask to access your blockchain deposits."
        />
      )}

      {isMetaMaskAvailable &&
        !isConnected && (
          <StateMessage
            icon={WalletCards}
            title="Wallet not connected"
            description="Connect MetaMask to view deposits owned by your wallet."
          />
        )}

      {isConnected &&
        isWrongNetwork && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unsupported network"
            description={`Switch MetaMask to ${SUPPORTED_NETWORK_NAME} before loading deposits.`}
          />
        )}

      {canReadBlockchain &&
        pageError && (
          <StateMessage
            variant="error"
            icon={AlertTriangle}
            title="Unable to load deposits"
            description={pageError}
            action={
              <button
                type="button"
                onClick={() =>
                  void reloadPageData()
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Try Again
              </button>
            }
          />
        )}

      {canReadBlockchain &&
        isRefreshing &&
        deposits.length === 0 && (
          <section className="space-y-5">
            <LoadingCard />
            <LoadingCard />
          </section>
        )}

      {canReadBlockchain &&
        !isRefreshing &&
        !pageError &&
        deposits.length === 0 && (
          <StateMessage
            icon={Landmark}
            title="No deposits yet"
            description="Choose a savings plan to create your first term deposit."
            action={
              <Link
                to="/plans"
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Browse Savings Plans
              </Link>
            }
          />
        )}

      {canReadBlockchain &&
        deposits.length > 0 && (
          <section className="space-y-5">
            {deposits.map(
              (deposit) => (
                <DepositCard
                  key={deposit.id.toString()}
                  deposit={deposit}
                  blockTimestamp={blockTimestamp}
                  onActionCompleted={() => {
                    void reloadPageData();
                  }}
                />
              ),
            )}
          </section>
        )}
    </div>
  );
};
