import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import { AppLayout } from './components/AppLayout';
import { WalletProvider } from './context/WalletContext';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepositDetailPage } from './pages/DepositDetailPage';
import { DepositsPage } from './pages/DepositsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlansPage } from './pages/PlansPage';

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              index
              element={<DashboardPage />}
            />
            <Route
              path="plans"
              element={<PlansPage />}
            />
            <Route
              path="deposits"
              element={<DepositsPage />}
            />
            <Route
              path="deposits/:depositId"
              element={<DepositDetailPage />}
            />
            <Route
              path="admin"
              element={<AdminPage />}
            />
            <Route
              path="*"
              element={<NotFoundPage />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
