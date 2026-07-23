import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';

import { SUPPORTED_NETWORK_NAME } from '../blockchain/addresses';
import { formatAddress } from '../blockchain/format';
import { useWalletContext } from '../context/WalletContext';

export const WalletButton = () => {
  const {
    account,
    error,
    isConnected,
    isConnecting,
    isMetaMaskAvailable,
    isWrongNetwork,
    connectWallet,
  } = useWalletContext();

  if (!isMetaMaskAvailable) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <AlertCircle className="h-4 w-4" />

        <span>MetaMask is not installed.</span>
      </div>
    );
  }

  if (isConnected && isWrongNetwork) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />

        <span>Switch MetaMask to {SUPPORTED_NETWORK_NAME}.</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>

        <div>
          <p className="text-xs text-slate-500">Connected wallet</p>

          <p className="text-sm font-medium text-slate-900">
            {formatAddress(account)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isConnecting}
        onClick={() => void connectWallet()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" />

        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
