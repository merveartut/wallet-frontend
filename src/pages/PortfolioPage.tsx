import { Link } from 'react-router-dom';
import { Alert } from '../components/ui';
import { OrderTable } from '../crypto/OrderTable';
import { formatPercent, formatPnl, formatPrice, formatQuantity, formatTry, pnlClass } from '../crypto/format';
import { useCryptoAccount } from '../crypto/useCryptoAccount';
import { usePriceStream } from '../crypto/usePriceStream';

export function PortfolioPage() {
  const { bySymbol, connected } = usePriceStream();
  const { portfolio, orders, error } = useCryptoAccount(10000);

  if (!portfolio && !error) return <p className="muted">Portföy yükleniyor…</p>;

  // Değerler canlı fiyatla tarayıcıda yeniden hesaplanır; sunucudaki değerler 10 sn'de bir gelir
  const positions = (portfolio?.positions ?? []).map((p) => {
    const price = bySymbol[p.symbol]?.price ?? p.currentPrice ?? p.averageCost;
    const marketValue = p.quantity * price;
    const unrealized = marketValue - p.costBasis;
    return { ...p, price, marketValue, unrealized, unrealizedPercent: p.costBasis ? (unrealized / p.costBasis) * 100 : 0 };
  });
  const held = positions.filter((p) => p.quantity > 0);
  const totalValue = held.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = held.reduce((s, p) => s + p.costBasis, 0);
  const totalUnrealized = totalValue - totalCost;
  const totalRealized = positions.reduce((s, p) => s + p.realizedPnl, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Portföy</h1>
          <p className="muted">Sanal alım-satım sonuçlarınız. Değerler canlı fiyatla güncellenir.</p>
        </div>
        <span className={`live ${connected ? 'on' : ''}`}>{connected ? 'Canlı' : 'Bağlanıyor…'}</span>
      </div>
      {error && <Alert kind="error">{error}</Alert>}

      <div className="totals">
        <div className="card total-card"><p className="muted">Piyasa değeri</p><strong>{formatTry(totalValue)}</strong></div>
        <div className="card total-card"><p className="muted">Maliyet</p><strong>{formatTry(totalCost)}</strong></div>
        <div className="card total-card">
          <p className="muted">Gerçekleşmemiş kâr/zarar</p>
          <strong className={pnlClass(totalUnrealized)}>{formatPnl(totalUnrealized)}</strong>
          <span className={pnlClass(totalUnrealized)}>{formatPercent(totalCost ? (totalUnrealized / totalCost) * 100 : 0)}</span>
        </div>
        <div className="card total-card">
          <p className="muted">Gerçekleşmiş kâr/zarar</p>
          <strong className={pnlClass(totalRealized)}>{formatPnl(totalRealized)}</strong>
        </div>
      </div>

      <section className="card">
        <h2>Pozisyonlar</h2>
        {held.length === 0 ? (
          <p className="muted small">Henüz coin'iniz yok. <Link to="/market">Piyasa</Link> sayfasından alım yapabilirsiniz.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th className="num">Adet</th>
                  <th className="num">Ort. maliyet</th>
                  <th className="num">Güncel fiyat</th>
                  <th className="num">Değer</th>
                  <th className="num">Kâr/zarar</th>
                </tr>
              </thead>
              <tbody>
                {held.map((p) => (
                  <tr key={p.symbol}>
                    <td><strong>{p.symbol}</strong></td>
                    <td className="num">
                      {formatQuantity(p.quantity)}
                      {p.reservedQuantity > 0 && <div className="status-reason">{formatQuantity(p.reservedQuantity)} emirde</div>}
                    </td>
                    <td className="num">{formatPrice(p.averageCost)}</td>
                    <td className="num">{formatPrice(p.price)}</td>
                    <td className="num">{formatTry(p.marketValue)}</td>
                    <td className={`num ${pnlClass(p.unrealized)}`}>
                      {formatPnl(p.unrealized)}<div className="status-reason">{formatPercent(p.unrealizedPercent)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Emir geçmişi</h2>
        <OrderTable orders={orders} emptyText="Henüz emriniz yok." />
      </section>
    </>
  );
}
