import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { WalletProvider } from "./context/WalletContext";
import { DashboardPage } from "./pages/DashboardPage";
import { DepositsPage } from "./pages/DepositsPage";
import { PlansPage } from "./pages/PlansPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="*" element={<NotFoundPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
