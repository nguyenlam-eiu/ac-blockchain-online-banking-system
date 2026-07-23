import {
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SUPPORTED_NETWORK_NAME } from '../blockchain/addresses';

const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Plans',
    to: '/plans',
    icon: PiggyBank,
  },
  {
    label: 'My Deposits',
    to: '/deposits',
    icon: ReceiptText,
  },
] as const;

export const Sidebar = () => {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Online Banking
        </p>

        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          Savings Portal
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {SUPPORTED_NETWORK_NAME}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-6 py-4">
        <p className="text-xs leading-5 text-slate-500">
          Blockchain term deposits powered by smart contracts.
        </p>
      </div>
    </aside>
  );
};
