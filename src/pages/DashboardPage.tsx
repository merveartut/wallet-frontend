import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { walletApi, type Account, type User } from '../api/walletApi';
import { useAuth } from '../auth/AuthContext';
import { useAccounts } from '../components/useAccounts';
import { Alert, SelectField, SubmitButton } from '../components/ui';
import { formatMoney } from '../utils/format';

const CURRENCIES = ['TRY', 'USD', 'EUR'];
const WAIT_FOR_FIRST_ACCOUNT_TRIES = 8;

export function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const justRegistered = (location.state as { justRegistered?: boolean } | null)?.justRegistered ?? false;
  const { accounts, loading, error, reload } = useAccounts();
  const [profile, setProfile] = useState<User | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (user) {
      walletApi.getUser(user.id).then(setProfile).catch(() => setProfile(null));
    }
  }, [user]);

  // Yeni kayıtta cüzdan Kafka üzerinden asenkron açılır: hesap gelene kadar birkaç kez yokla
  useEffect(() => {
    if (loading || accounts.length > 0 || error) return;
    let tries = 0;
    setWaiting(true);
    const timer = window.setInterval(async () => {
      tries += 1;
      const list = await reload();
      if (list.length > 0 || tries >= WAIT_FOR_FIRST_ACCOUNT_TRIES) {
        window.clearInterval(timer);
        setWaiting(false);
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loading, accounts.length, error, reload]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    accounts.forEach((a) => byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + a.balance));
    return [...byCurrency.entries()];
  }, [accounts]);

  return (
    <>
      <section className="page-header">
        <div>
          <h1>Merhaba, {user?.username}</h1>
          {profile?.email && <p className="muted">{profile.email}</p>}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void reload()}>
          ↻ Yenile
        </button>
      </section>

      {justRegistered && <Alert kind="success">Kaydınız tamamlandı. Hoş geldiniz!</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {totals.length > 0 && (
        <section className="totals">
          {totals.map(([currency, total]) => (
            <div key={currency} className="card total-card">
              <span className="muted">Toplam bakiye ({currency})</span>
              <strong>{formatMoney(total, currency)}</strong>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Hesaplarım</h2>
        {loading ? (
          <p className="muted">Hesaplar yükleniyor…</p>
        ) : accounts.length === 0 ? (
          <div className="card empty">
            {waiting ? (
              <p>Cüzdanınız hazırlanıyor, birkaç saniye içinde burada görünecek…</p>
            ) : (
              <p>Henüz hesabınız yok. Aşağıdan yeni bir hesap açabilirsiniz.</p>
            )}
          </div>
        ) : (
          <div className="account-grid">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <CreateAccountForm onCreated={reload} />
        <div className="card">
          <h2>Para Gönder</h2>
          <p className="muted">Hesaplarınızdan başka bir hesaba transfer yapın.</p>
          <Link to="/transfer" className="btn btn-primary">Transfer Yap</Link>
        </div>
      </div>
    </>
  );
}

function AccountCard({ account }: { account: Account }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // pano erişimi yoksa sessizce geç
    }
  }

  return (
    <div className="card account-card">
      <div className="account-top">
        <span className="currency">{account.currency}</span>
        <button type="button" className="btn btn-link" onClick={copy} title="Hesap numarasını kopyala">
          {copied ? 'Kopyalandı ✓' : 'Kopyala'}
        </button>
      </div>
      <code className="account-number">{account.accountNumber}</code>
      <strong className="balance">{formatMoney(account.balance, account.currency)}</strong>
    </div>
  );
}

function CreateAccountForm({ onCreated }: { onCreated: () => Promise<unknown> }) {
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await walletApi.createAccount(currency);
      setMessage({ kind: 'success', text: result });
      await onCreated();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Hesap açılamadı.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Yeni Hesap Aç</h2>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <SelectField label="Para birimi" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </SelectField>
      <SubmitButton loading={loading}>Hesap Aç</SubmitButton>
    </form>
  );
}
