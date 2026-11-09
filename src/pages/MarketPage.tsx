import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { cryptoApi, type Candle, type CryptoOrder } from '../api/cryptoApi';
import { useAccounts } from '../components/useAccounts';
import { Alert } from '../components/ui';
import { OrderForm } from '../crypto/OrderForm';
import { OrderTable } from '../crypto/OrderTable';
import { PriceChart } from '../crypto/PriceChart';
import { formatPercent, formatPrice, formatTry } from '../crypto/format';
import { useCryptoAccount } from '../crypto/useCryptoAccount';
import { usePriceStream } from '../crypto/usePriceStream';

const RANGES = [
  { label: '1S', interval: '1m', limit: 60 },
  { label: '1G', interval: '15m', limit: 96 },
  { label: '1H', interval: '1h', limit: 168 },
  { label: '1A', interval: '4h', limit: 180 },
  { label: '1Y', interval: '1d', limit: 365 },
] as const;

export function MarketPage() {
  const { prices, bySymbol, ticks, connected } = usePriceStream();
  const { accounts, reload: reloadAccounts } = useAccounts();
  const { portfolio, orders, reload: reloadCrypto } = useCryptoAccount();
  const [symbol, setSymbol] = useState('BTC');
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [triggerPrice, setTriggerPrice] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCandles([]);
    setChartError(null);
    cryptoApi.getCandles(symbol, range.interval, range.limit)
      .then((c) => active && setCandles(c))
      .catch((e) => active && setChartError(e instanceof ApiError ? e.message : 'Grafik yüklenemedi.'));
    return () => { active = false; };
  }, [symbol, range]);

  const ticker = bySymbol[symbol];
  const position = portfolio?.positions.find((p) => p.symbol === symbol);
  const openOrders = orders.filter((o) => o.status === 'OPEN' || o.status === 'EXECUTING');

  async function handlePlaced(order: CryptoOrder) {
    if (order.symbol !== symbol) setSymbol(order.symbol);
    await Promise.all([reloadAccounts(), reloadCrypto()]);
  }

  async function handleCancel(order: CryptoOrder) {
    setCancellingId(order.id);
    setCancelError(null);
    try {
      await cryptoApi.cancelOrder(order.id);
      await reloadCrypto();
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : 'Emir iptal edilemedi.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Piyasa</h1>
          <p className="muted">Canlı Binance fiyatları · alım-satım sanal TRY bakiyenizle yapılır, gerçek değildir.</p>
        </div>
        <span className={`live ${connected ? 'on' : ''}`}>{connected ? 'Canlı' : 'Bağlanıyor…'}</span>
      </div>

      <div className="market">
        <section className="card ticker-list" aria-label="Fiyatlar">
          {prices.length === 0 && <p className="muted small">Fiyatlar yükleniyor…</p>}
          {prices.map((p) => {
            const tick = ticks[p.symbol];
            const owned = portfolio?.positions.find((h) => h.symbol === p.symbol && h.quantity > 0);
            return (
              <button key={p.symbol} type="button" className={`ticker ${p.symbol === symbol ? 'selected' : ''}`}
                onClick={() => setSymbol(p.symbol)}>
                <span className="ticker-symbol">
                  {p.symbol}
                  {owned && <span className="owned" title={`Elinizde: ${owned.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 8 })} ${p.symbol}`}>●</span>}
                </span>
                <span key={tick?.seq} className={`ticker-price ${tick ? `flash-${tick.direction}` : ''}`}>
                  {formatPrice(p.price)}
                </span>
                <span className={`ticker-change ${p.changePercent24h >= 0 ? 'up' : 'down'}`}>
                  {formatPercent(p.changePercent24h)}
                </span>
              </button>
            );
          })}
        </section>

        <section className="card coin-detail">
          <div className="coin-head">
            <div>
              <span className="muted-inline">{symbol} / TRY</span>
              <div className="coin-price">{formatPrice(ticker?.price)}</div>
              {ticker && (
                <span className={ticker.changePercent24h >= 0 ? 'up' : 'down'}>
                  {formatPercent(ticker.changePercent24h)} <span className="muted-inline">24 saat</span>
                </span>
              )}
            </div>
            <div className="ranges" role="group" aria-label="Zaman aralığı">
              {RANGES.map((r) => (
                <button key={r.label} type="button" className={r === range ? 'active' : ''} onClick={() => setRange(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {chartError ? <Alert kind="error">{chartError}</Alert> : (
            <PriceChart candles={candles} livePrice={ticker?.price} triggerPrice={triggerPrice} />
          )}
          {ticker && (
            <div className="coin-stats">
              <div><span className="muted-inline">24s en yüksek</span><strong>{formatPrice(ticker.high24h)}</strong></div>
              <div><span className="muted-inline">24s en düşük</span><strong>{formatPrice(ticker.low24h)}</strong></div>
              <div><span className="muted-inline">24s hacim</span><strong>{formatTry(ticker.quoteVolume24h)}</strong></div>
              <div><span className="muted-inline">Elinizdeki</span><strong>{position ? `${position.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 8 })} ${symbol}` : '—'}</strong></div>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Emir ver</h2>
          <OrderForm symbol={symbol} price={ticker?.price} accounts={accounts}
            positions={portfolio?.positions ?? []} onSymbolChange={setSymbol}
            onPlaced={handlePlaced} onTriggerPriceChange={setTriggerPrice} />
        </section>
      </div>

      <section className="card">
        <h2>Bekleyen emirler</h2>
        {cancelError && <Alert kind="error">{cancelError}</Alert>}
        <OrderTable orders={openOrders} onCancel={handleCancel} cancellingId={cancellingId}
          emptyText="Bekleyen emriniz yok. Limit veya stop emri verdiğinizde burada görünür." />
      </section>
    </>
  );
}
