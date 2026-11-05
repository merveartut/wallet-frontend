import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { walletApi } from '../api/walletApi';
import { useAccounts } from '../components/useAccounts';
import { Alert, Field, SelectField, SubmitButton } from '../components/ui';
import { formatMoney, parseAmount } from '../utils/format';

export function TransferPage() {
  const { accounts, loading: accountsLoading, error: accountsError, reload } = useAccounts();
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Hesaplar yüklenince ilk hesabı kaynak olarak seç
  useEffect(() => {
    if (!fromAccount && accounts.length > 0) setFromAccount(accounts[0].accountNumber);
  }, [accounts, fromAccount]);

  const selected = accounts.find((a) => a.accountNumber === fromAccount);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const parsedAmount = parseAmount(amount);
    const errors: Record<string, string> = {};
    if (!fromAccount) errors.fromAccount = 'Kaynak hesap seçin';
    if (!toAccount.trim()) errors.toAccount = 'Hedef hesap numarası boş olamaz';
    else if (toAccount.trim() === fromAccount) errors.toAccount = 'Kaynak ve hedef hesap aynı olamaz';
    if (parsedAmount === null) errors.amount = 'Geçerli bir tutar girin (ör. 25 veya 25,50)';
    else if (selected && parsedAmount > selected.balance) errors.amount = 'Tutar bakiyenizden fazla';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || parsedAmount === null) return;

    setLoading(true);
    try {
      const result = await walletApi.transfer({ fromAccount, toAccount: toAccount.trim(), amount: parsedAmount });
      setMessage({ kind: 'success', text: result });
      setToAccount('');
      setAmount('');
      await reload();
    } catch (e) {
      if (e instanceof ApiError) {
        const serverErrors = e.fieldErrorMap();
        // "Kaynak ve hedef aynı" hatası sunucudan sınıf seviyesinde gelir; hedef alanının altında göster
        if (serverErrors.differentAccounts) serverErrors.toAccount = serverErrors.differentAccounts;
        setFieldErrors(serverErrors);
        setMessage({ kind: 'error', text: e.message });
      } else {
        setMessage({ kind: 'error', text: 'Transfer yapılamadı.' });
      }
    } finally {
      setLoading(false);
    }
  }

  if (accountsLoading) return <p className="muted">Hesaplar yükleniyor…</p>;

  return (
    <div className="narrow">
      <h1>Para Transferi</h1>
      {accountsError && <Alert kind="error">{accountsError}</Alert>}
      {!accountsError && accounts.length === 0 && (
        <Alert kind="info">Transfer yapabilmek için önce bir hesabınız olmalı.</Alert>
      )}

      {accounts.length > 0 && (
        <form className="card" onSubmit={handleSubmit} noValidate>
          {message && <Alert kind={message.kind}>{message.text}</Alert>}

          <SelectField label="Kaynak hesap" name="fromAccount" value={fromAccount}
            onChange={(e) => setFromAccount(e.target.value)} error={fieldErrors.fromAccount}>
            {accounts.map((a) => (
              <option key={a.id} value={a.accountNumber}>
                {a.accountNumber} — {formatMoney(a.balance, a.currency)}
              </option>
            ))}
          </SelectField>

          <Field label="Hedef hesap numarası" name="toAccount" placeholder="ACC-…" value={toAccount}
            onChange={(e) => setToAccount(e.target.value)} error={fieldErrors.toAccount}
            hint="Kendi hesaplarınıza veya başka bir kullanıcının hesabına gönderebilirsiniz." />

          <Field label="Tutar" name="amount" inputMode="decimal" placeholder="0,00" value={amount}
            onChange={(e) => setAmount(e.target.value)} error={fieldErrors.amount}
            hint={selected ? `Kullanılabilir bakiye: ${formatMoney(selected.balance, selected.currency)}` : undefined} />

          <SubmitButton loading={loading}>Gönder</SubmitButton>
        </form>
      )}
    </div>
  );
}
