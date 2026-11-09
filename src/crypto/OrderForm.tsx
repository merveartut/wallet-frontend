import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { cryptoApi, type CryptoOrder, type OrderSide, type OrderType, type Position } from '../api/cryptoApi';
import type { Account } from '../api/walletApi';
import { Alert, Field, SelectField, SubmitButton } from '../components/ui';
import { formatPrice, formatQuantity, formatTry, parseDecimal, quantityFromAmount } from './format';

interface OrderFormProps {
  symbol: string;
  price: number | undefined;
  accounts: Account[];
  /** Kullanıcının pozisyonları; satışta coin seçimi ve satılabilir adet buradan gelir */
  positions: Position[];
  onSymbolChange: (symbol: string) => void;
  onPlaced: (order: CryptoOrder) => void;
  onTriggerPriceChange: (price: number | null) => void;
}

type Unit = 'QUANTITY' | 'AMOUNT';

const typeHints: Record<OrderType, Record<OrderSide, string>> = {
  MARKET: { BUY: 'Anlık fiyattan hemen alınır.', SELL: 'Anlık fiyattan hemen satılır.' },
  LIMIT: {
    BUY: 'Fiyat bu seviyeye veya altına düşünce alınır (daha ucuza almak için).',
    SELL: 'Fiyat bu seviyeye veya üstüne çıkınca satılır (kâr al).',
  },
  STOP: {
    BUY: 'Fiyat bu seviyeye veya üstüne çıkınca alınır (yükseliş kırılımı).',
    SELL: 'Fiyat bu seviyeye veya altına düşünce satılır (zarar kes).',
  },
};

export function OrderForm({ symbol, price, accounts, positions, onSymbolChange, onPlaced, onTriggerPriceChange }: OrderFormProps) {
  const held = useMemo(() => positions.filter((p) => p.quantity > 0), [positions]);
  const available = positions.find((p) => p.symbol === symbol)?.availableQuantity ?? 0;
  const tryAccounts = useMemo(() => accounts.filter((a) => a.currency === 'TRY'), [accounts]);
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [unit, setUnit] = useState<Unit>('AMOUNT');
  const [value, setValue] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountNumber && tryAccounts.length > 0) setAccountNumber(tryAccounts[0].accountNumber);
  }, [tryAccounts, accountNumber]);

  // Coin değişince formu sıfırla
  useEffect(() => {
    setValue('');
    setTriggerPrice('');
    setResult(null);
    setFieldErrors({});
  }, [symbol]);

  const parsedTrigger = type === 'MARKET' ? null : parseDecimal(triggerPrice, 8);
  useEffect(() => {
    onTriggerPriceChange(parsedTrigger ? Number(parsedTrigger) : null);
  }, [parsedTrigger, onTriggerPriceChange]);

  const account = tryAccounts.find((a) => a.accountNumber === accountNumber);
  const referencePrice = type === 'MARKET' ? price : parsedTrigger ? Number(parsedTrigger) : undefined;
  const quantity = (() => {
    if (unit === 'QUANTITY') return parseDecimal(value, 8);
    const amount = parseDecimal(value, 2);
    return amount && referencePrice ? quantityFromAmount(Number(amount), referencePrice) : null;
  })();
  const estimatedTotal = quantity && referencePrice ? Number(quantity) * referencePrice : null;

  /** Satışa geçerken seçili coin elde yoksa, elde olan ilk coin'e geç */
  function handleSellClick() {
    setSide('SELL');
    if (!held.some((p) => p.symbol === symbol) && held.length > 0) {
      onSymbolChange(held[0].symbol);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    const errors: Record<string, string> = {};
    if (!account) errors.accountNumber = 'TRY hesabı seçin';
    if (type !== 'MARKET' && !parsedTrigger) errors.triggerPrice = 'Geçerli bir fiyat girin';
    if (!quantity || Number(quantity) <= 0) {
      errors.quantity = unit === 'AMOUNT' ? 'Geçerli bir tutar girin (ör. 500)' : 'Geçerli bir adet girin (ör. 0,0015)';
    } else if (side === 'SELL' && Number(quantity) > available) {
      errors.quantity = `Satılabilir ${symbol}: ${formatQuantity(available)}`;
    } else if (side === 'BUY' && type === 'MARKET' && account && estimatedTotal && estimatedTotal > account.balance) {
      errors.quantity = 'Tutar hesap bakiyenizden fazla';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !quantity) return;

    setLoading(true);
    try {
      const order = await cryptoApi.placeOrder({
        symbol,
        side,
        type,
        quantity,
        triggerPrice: type === 'MARKET' ? undefined : parsedTrigger ?? undefined,
        accountNumber,
      });
      setResult(describe(order));
      if (order.status === 'COMPLETED' || order.status === 'OPEN') {
        setValue('');
        setTriggerPrice('');
      }
      onPlaced(order);
    } catch (e) {
      if (e instanceof ApiError) {
        const serverErrors = e.fieldErrorMap();
        if (serverErrors.triggerPriceConsistent) serverErrors.triggerPrice = serverErrors.triggerPriceConsistent;
        setFieldErrors(serverErrors);
        setResult({ kind: 'error', text: e.message });
      } else {
        setResult({ kind: 'error', text: 'Emir gönderilemedi.' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit} noValidate>
      <div className="segmented" role="group" aria-label="İşlem yönü">
        <button type="button" className={side === 'BUY' ? 'active buy' : ''} onClick={() => setSide('BUY')}>Al</button>
        <button type="button" className={side === 'SELL' ? 'active sell' : ''} onClick={handleSellClick}>Sat</button>
      </div>

      {side === 'SELL' && (
        held.length === 0 ? (
          <Alert kind="info">Satabileceğiniz coin yok. Önce alım yapın.</Alert>
        ) : (
          <SelectField label="Satılacak coin" name="sellSymbol" value={held.some((p) => p.symbol === symbol) ? symbol : ''}
            onChange={(e) => e.target.value && onSymbolChange(e.target.value)}>
            {!held.some((p) => p.symbol === symbol) && <option value="">{symbol} elinizde yok — coin seçin</option>}
            {held.map((p) => (
              <option key={p.symbol} value={p.symbol}>
                {p.symbol} — {formatQuantity(p.availableQuantity)} satılabilir
                {p.reservedQuantity > 0 ? ` (${formatQuantity(p.reservedQuantity)} emirde)` : ''}
              </option>
            ))}
          </SelectField>
        )
      )}

      <SelectField label="Emir tipi" name="type" value={type} onChange={(e) => setType(e.target.value as OrderType)}>
        <option value="MARKET">Piyasa</option>
        <option value="LIMIT">Limit</option>
        <option value="STOP">Stop</option>
      </SelectField>
      <p className="field-hint hint-block">{typeHints[type][side]}</p>

      {type !== 'MARKET' && (
        <Field label="Tetikleme fiyatı (TRY)" name="triggerPrice" inputMode="decimal" value={triggerPrice}
          onChange={(e) => setTriggerPrice(e.target.value)} error={fieldErrors.triggerPrice}
          hint={price ? `Anlık: ${formatPrice(price)}` : undefined} />
      )}

      <div className="field">
        <div className="label-row">
          <label htmlFor="quantity">{unit === 'AMOUNT' ? 'Tutar (TRY)' : `Adet (${symbol})`}</label>
          <button type="button" className="btn-link" onClick={() => { setUnit(unit === 'AMOUNT' ? 'QUANTITY' : 'AMOUNT'); setValue(''); }}>
            {unit === 'AMOUNT' ? 'Adet gir' : 'TRY tutarı gir'}
          </button>
        </div>
        <input id="quantity" name="quantity" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
          aria-invalid={fieldErrors.quantity ? true : undefined} placeholder={unit === 'AMOUNT' ? 'ör. 500' : 'ör. 0,0015'} />
        {fieldErrors.quantity ? (
          <span className="field-error">{fieldErrors.quantity}</span>
        ) : (
          <span className="field-hint">
            {side === 'SELL' ? `Satılabilir: ${formatQuantity(available)} ${symbol}` : null}
            {side === 'SELL' && available > 0 && (
              <> · <button type="button" className="btn-link" onClick={() => { setUnit('QUANTITY'); setValue(String(available)); }}>Tümü</button></>
            )}
            {side === 'BUY' && account ? `Bakiye: ${formatTry(account.balance)}` : null}
          </span>
        )}
      </div>

      <SelectField label="TRY hesabı" name="accountNumber" value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)} error={fieldErrors.accountNumber}>
        {tryAccounts.length === 0 && <option value="">TRY hesabınız yok</option>}
        {tryAccounts.map((a) => (
          <option key={a.id} value={a.accountNumber}>
            {a.accountNumber.slice(0, 13)}… — {formatTry(a.balance)}
          </option>
        ))}
      </SelectField>

      <div className="estimate">
        <span>{unit === 'AMOUNT' ? 'Yaklaşık adet' : 'Tahmini tutar'}</span>
        <strong>
          {unit === 'AMOUNT'
            ? quantity ? `${formatQuantity(Number(quantity))} ${symbol}` : '—'
            : estimatedTotal ? formatTry(estimatedTotal) : '—'}
        </strong>
      </div>

      {result && <Alert kind={result.kind}>{result.text}</Alert>}
      <SubmitButton loading={loading}>
        {side === 'BUY' ? `${symbol} Al` : `${symbol} Sat`}
      </SubmitButton>
    </form>
  );
}

function describe(order: CryptoOrder): { kind: 'success' | 'error' | 'info'; text: string } {
  const what = `${formatQuantity(order.quantity)} ${order.symbol}`;
  switch (order.status) {
    case 'COMPLETED':
      return {
        kind: 'success',
        text: `${what} ${order.side === 'BUY' ? 'alındı' : 'satıldı'}: ${formatPrice(order.executedPrice)} fiyattan, toplam ${formatTry(order.totalAmount)}.`,
      };
    case 'OPEN':
      return { kind: 'info', text: `Emir kaydedildi; fiyat ${formatPrice(order.triggerPrice)} seviyesine gelince gerçekleşecek.` };
    case 'EXECUTING':
      return { kind: 'info', text: order.failureReason ?? 'Emir işleniyor…' };
    default:
      return { kind: 'error', text: order.failureReason ?? 'Emir gerçekleştirilemedi.' };
  }
}
