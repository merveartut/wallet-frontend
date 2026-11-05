import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field, SubmitButton } from '../components/ui';

export function LoginPage() {
  const { login, logoutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrorMap());
      } else {
        setError('Giriş yapılamadı.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Giriş Yap</h1>
        <p className="muted">Cüzdanınıza erişmek için giriş yapın.</p>

        {logoutReason && !error && <Alert kind="info">{logoutReason}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}

        <Field label="Kullanıcı adı" name="username" autoComplete="username" value={username}
          onChange={(e) => setUsername(e.target.value)} error={fieldErrors.username} required autoFocus />
        <Field label="Şifre" name="password" type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} required />

        <SubmitButton loading={loading}>Giriş Yap</SubmitButton>
        <p className="auth-switch">
          Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
        </p>
      </form>
    </div>
  );
}
