import type { CryptoOrder } from '../api/cryptoApi';
import { formatDateTime, formatPrice, formatQuantity, formatTry, sideLabel, statusLabel, typeLabel } from './format';

interface OrderTableProps {
  orders: CryptoOrder[];
  onCancel?: (order: CryptoOrder) => void;
  cancellingId?: number | null;
  emptyText: string;
}

export function OrderTable({ orders, onCancel, cancellingId, emptyText }: OrderTableProps) {
  if (orders.length === 0) return <p className="muted small">{emptyText}</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Coin</th>
            <th>İşlem</th>
            <th className="num">Adet</th>
            <th className="num">Fiyat</th>
            <th className="num">Tutar</th>
            <th>Durum</th>
            {onCancel && <th />}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="nowrap">{formatDateTime(o.createdAt)}</td>
              <td><strong>{o.symbol}</strong></td>
              <td className="nowrap">
                <span className={o.side === 'BUY' ? 'up' : 'down'}>{sideLabel[o.side]}</span>{' '}
                <span className="muted-inline">{typeLabel[o.type]}</span>
              </td>
              <td className="num">{formatQuantity(o.quantity)}</td>
              <td className="num nowrap">
                {o.executedPrice !== null ? formatPrice(o.executedPrice) : (
                  <span className="muted-inline" title="Tetikleme fiyatı">
                    {o.type === 'LIMIT' ? (o.side === 'BUY' ? '≤ ' : '≥ ') : o.side === 'BUY' ? '≥ ' : '≤ '}
                    {formatPrice(o.triggerPrice)}
                  </span>
                )}
              </td>
              <td className="num nowrap">{formatTry(o.totalAmount)}</td>
              <td>
                <span className={`status status-${o.status.toLowerCase()}`}>{statusLabel[o.status]}</span>
                {o.failureReason && <div className="status-reason">{o.failureReason}</div>}
              </td>
              {onCancel && (
                <td className="num">
                  {o.status === 'OPEN' && (
                    <button type="button" className="btn-link" disabled={cancellingId === o.id} onClick={() => onCancel(o)}>
                      {cancellingId === o.id ? 'İptal ediliyor…' : 'İptal'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
