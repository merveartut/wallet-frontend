import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Giriş yapılmış sayfaların ortak çerçevesi: üst menü + sayfa içeriği */
export function Layout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">◆ Wallet</span>
          <nav className="nav">
            <NavLink to="/" end>Hesaplarım</NavLink>
            <NavLink to="/transfer">Transfer</NavLink>
            <NavLink to="/market">Piyasa</NavLink>
            <NavLink to="/portfolio">Portföy</NavLink>
            {isAdmin && <NavLink to="/deposit">Para Yatır</NavLink>}
          </nav>
          <div className="session">
            <span className="username">{user?.username}</span>
            {isAdmin && <span className="badge">ADMIN</span>}
            <button type="button" className="btn btn-ghost" onClick={() => logout()}>
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
