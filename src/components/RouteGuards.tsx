import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Giriş yapmamış kullanıcıyı giriş sayfasına yönlendirir; girişten sonra geldiği sayfaya döner */
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Yalnızca ADMIN rolündekiler görebilir. Bu yalnızca arayüz kolaylığıdır:
 * asıl yetki kontrolünü backend yapar (USER rolüyle istek atılırsa 403 döner).
 */
export function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

/** Giriş yapmış kullanıcı giriş/kayıt sayfasını açarsa ana sayfaya gönderir */
export function GuestOnly() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
