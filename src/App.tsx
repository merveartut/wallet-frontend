import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/RouteGuards';
import { DashboardPage } from './pages/DashboardPage';
import { DepositPage } from './pages/DepositPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TransferPage } from './pages/TransferPage';

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transfer" element={<TransferPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/deposit" element={<DepositPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
