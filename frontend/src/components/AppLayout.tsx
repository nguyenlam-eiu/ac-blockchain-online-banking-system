import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { WalletButton } from './WalletButton';

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex min-h-20 items-center justify-between gap-6 px-8">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Blockchain Savings
              </p>

              <h2 className="text-xl font-semibold text-slate-900">
                Online Banking System
              </h2>
            </div>

            <WalletButton />
          </div>
        </header>

        <main className="flex-1 px-8 py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
