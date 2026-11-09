import { useMemo, useState, type MouseEvent } from 'react';
import type { Candle } from '../api/cryptoApi';
import { formatPrice } from './format';

const WIDTH = 640;
const HEIGHT = 220;
const PAD_Y = 12;

interface PriceChartProps {
  candles: Candle[];
  /** Son mumun kapanışı yerine canlı fiyat */
  livePrice?: number;
  /** Bekleyen emrin tetikleme fiyatı: kesikli çizgi */
  triggerPrice?: number | null;
}

/** Kapanış fiyatlarından alan grafiği. Bağımlılık eklememek için düz SVG. */
export function PriceChart({ candles, livePrice, triggerPrice }: PriceChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(() => {
    const closes = candles.map((c) => c.close);
    if (livePrice !== undefined && closes.length > 0) closes[closes.length - 1] = livePrice;
    return closes;
  }, [candles, livePrice]);

  if (points.length < 2) {
    return <div className="chart chart-empty">Grafik yükleniyor…</div>;
  }

  const values = triggerPrice ? [...points, triggerPrice] : points;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * WIDTH;
  const y = (v: number) => PAD_Y + (1 - (v - min) / range) * (HEIGHT - 2 * PAD_Y);

  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
  const rising = points[points.length - 1] >= points[0];

  function handleMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  }

  const hovered = hover !== null ? { price: points[hover], time: candles[hover]?.openTime } : null;

  return (
    <div className={`chart ${rising ? 'up' : 'down'}`}>
      <div className="chart-legend">
        {hovered ? (
          <>
            <strong>{formatPrice(hovered.price)}</strong>
            <span className="muted-inline">{new Date(hovered.time).toLocaleString('tr-TR')}</span>
          </>
        ) : (
          <>
            <span className="muted-inline">En yüksek {formatPrice(Math.max(...points))}</span>
            <span className="muted-inline">En düşük {formatPrice(Math.min(...points))}</span>
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img"
        aria-label="Fiyat grafiği" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" vectorEffect="non-scaling-stroke" />
        {triggerPrice ? (
          <line x1={0} x2={WIDTH} y1={y(triggerPrice)} y2={y(triggerPrice)} className="chart-trigger"
            vectorEffect="non-scaling-stroke" />
        ) : null}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={HEIGHT} className="chart-cursor" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}
