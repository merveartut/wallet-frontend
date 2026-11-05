import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { walletApi, type Account } from '../api/walletApi';
import { Alert, Field, SelectField, SubmitButton } from '../components/ui';
import { formatMoney, parseAmount } from '../utils/format';

/** Yalnızca ADMIN: sistemdeki herhangi bir hesaba para yatırma */
export function DepositPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    setAccountsError(null);
    try {
      setAccounts(await walletApi.getAllAccounts());
    } catch (e) {
      setAccountsError(e instanceof ApiError ? e.message : 'Hesaplar yüklenemedi.');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  // Hesap no, kullanıcı id'si veya para birimine göre filtrele
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return accounts;
    return accounts.filter((a) =>
      [a.accountNumber, `#${a.userId}`, String(a.userId), a.currency].some((v) =>
        v.toLocaleLowerCase('tr-TR').includes(q),
      ),
    );
  }, [accounts, search]);

  // Seçili hesap filtrede kalmadıysa ilk eşleşeni seç
  useEffect(() => {
    if (filtered.length === 0) {
      setAccountNumber('');
    } else if (!filtered.some((a) => a.accountNumber === accountNumber)) {
      setAccountNumber(filtered[0].accountNumber);
    }
  }, [filtered, accountNumber]);

  const selected = accounts.find((a) => a.accountNumber === accountNumber);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const parsedAmount = parseAmount(amount);
    const errors: Record<string, string> = {};
    if (!accountNumber) errors.accountNumber = 'Bir hesap seçin';
    if (parsedAmount === null) errors.amount = 'Geçerli bir tutar girin (ör. 100 veya 100,50)';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || parsedAmount === null) return;

    setLoading(true);
    try {
      const result = await walletApi.deposit(accountNumber, parsedAmount);
      setMessage({ kind: 'success', text: result });
      setAmount('');
      await loadAccounts(); // listedeki bakiyeyi güncelle
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Para yatırılamadı.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="narrow">
      <h1>Para Yatır <span className="badge">ADMIN</span></h1>
      <p className="muted">Sistemdeki herhangi bir hesaba para yatırabilirsiniz. Bu işlem yalnızca yöneticilere açıktır.</p>

      {accountsLoading ? (
        <p className="muted">Hesaplar yükleniyor…</p>
      ) : accountsError ? (
        <Alert kind="error">{accountsError}</Alert>
      ) : (
        <form className="card" onSubmit={handleSubmit} noValidate>
          {message && <Alert kind={message.kind}>{message.text}</Alert>}

          <Field label="Hesap ara" name="search" type="search" placeholder="Hesap no, kullanıcı no (#12) veya para birimi"
            value={search} onChange={(e) => setSearch(e.target.value)}
            hint={`${filtered.length} / ${accounts.length} hesap listeleniyor`} />

          <SelectField label="Hesap" name="accountNumber" value={accountNumber} size={Math.min(Math.max(filtered.length, 2), 8)}
            onChange={(e) => setAccountNumber(e.target.value)} error={fieldErrors.accountNumber}>
            {filtered.length === 0 && <option value="" disabled>Aramaya uyan hesap yok</option>}
            {filtered.map((a) => (
              <option key={a.id} value={a.accountNumber}>
                {a.accountNumber} · Kullanıcı #{a.userId} · {formatMoney(a.balance, a.currency)}
              </option>
            ))}
          </SelectField>

          {selected && (
            <div className="selected-account">
              <span className="muted">Seçili hesap</span>
              <code>{selected.accountNumber}</code>
              <span>Kullanıcı #{selected.userId} · Bakiye {formatMoney(selected.balance, selected.currency)}</span>
            </div>
          )}

          <Field label="Tutar" name="amount" inputMode="decimal" placeholder="0,00" value={amount}
            onChange={(e) => setAmount(e.target.value)} error={fieldErrors.amount}
            hint={selected ? `Para birimi: ${selected.currency}` : undefined} />

          <SubmitButton loading={loading}>Para Yatır</SubmitButton>
        </form>
      )}
    </div>
  );
}
