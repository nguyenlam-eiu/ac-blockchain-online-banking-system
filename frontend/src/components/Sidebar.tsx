import {
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import {
  SUPPORTED_NETWORK_NAME,
} from '../blockchain/addresses';
import { useWalletContext } from '../context/WalletContext';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

const USER_ITEMS = [
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
  const {
    isConnected,
    isWrongNetwork,
  } = useWalletContext();
  const { isOwner } =
    useAdminDashboard();

  const navigationItems =
    isConnected &&
    !isWrongNetwork &&
    isOwner
      ? [
          ...USER_ITEMS,
          {
            label: 'Administration',
            to: '/admin',
            icon: Settings,
          },
        ]
      : USER_ITEMS;

  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <div>
        <p className="text-sm font-medium text-blue-700">
          Online Banking
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          Savings Portal
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {SUPPORTED_NETWORK_NAME}
        </p>
      </div>

      <nav className="mt-8 space-y-1">
        {navigationItems.map((item) => {
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
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <p className="mt-auto pt-8 text-xs leading-5 text-slate-500">
        Blockchain term deposits powered by smart contracts.
      </p>
    </aside>
  );
};
