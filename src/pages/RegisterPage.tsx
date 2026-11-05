import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { walletApi } from '../api/walletApi';
import { useAuth } from '../auth/AuthContext';
import { Alert, Field, SubmitButton } from '../components/ui';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Sunucuya gitmeden yakalanabilecek hatalar
    const clientErrors: Record<string, string> = {};
    if (!form.username.trim()) clientErrors.username = 'Kullanıcı adı boş olamaz';
    if (!form.password) clientErrors.password = 'Şifre boş olamaz';
    if (form.password !== form.passwordConfirm) clientErrors.passwordConfirm = 'Şifreler eşleşmiyor';
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    try {
      await walletApi.register({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
      });
      // Kayıttan sonra otomatik giriş; cüzdan Kafka üzerinden birkaç saniye içinde açılır
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true, state: { justRegistered: true } });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrorMap());
      } else {
        setError('Kayıt tamamlanamadı.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Kayıt Ol</h1>
        <p className="muted">Kayıt olduğunuzda size otomatik olarak bir cüzdan hesabı açılır.</p>

        {error && <Alert kind="error">{error}</Alert>}

        <Field label="Kullanıcı adı" name="username" autoComplete="username" value={form.username}
          onChange={update('username')} error={fieldErrors.username} required autoFocus />
        <Field label="E-posta (isteğe bağlı)" name="email" type="email" autoComplete="email" value={form.email}
          onChange={update('email')} error={fieldErrors.email} />
        <Field label="Şifre" name="password" type="password" autoComplete="new-password" value={form.password}
          onChange={update('password')} error={fieldErrors.password} required />
        <Field label="Şifre (tekrar)" name="passwordConfirm" type="password" autoComplete="new-password"
          value={form.passwordConfirm} onChange={update('passwordConfirm')} error={fieldErrors.passwordConfirm}
          required />

        <SubmitButton loading={loading}>Kayıt Ol</SubmitButton>
        <p className="auth-switch">
          Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
        </p>
      </form>
    </div>
  );
}
