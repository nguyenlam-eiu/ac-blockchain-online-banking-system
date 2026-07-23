import { Landmark } from 'lucide-react';

import { WalletButton } from './components/WalletButton';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
              <Landmark className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Online Banking
              </h1>

              <p className="text-sm text-slate-500">
                Blockchain term deposits on Sepolia
              </p>
            </div>
          </div>

          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-10">
        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Savings dashboard
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Manage your blockchain deposits
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Connect MetaMask on Sepolia to view available saving plans,
            create deposits, and manage withdrawals.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
