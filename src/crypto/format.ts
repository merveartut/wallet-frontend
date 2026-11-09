import type { OrderSide, OrderStatus, OrderType } from '../api/cryptoApi';

/** Fiyat: büyük değerlerde 2, küçüklerde (DOGE, ADA) 4 ondalık */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const digits = value >= 100 ? 2 : 4;
  return '₺' + value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

export function formatTry(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return '₺' + value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Coin adedi: en fazla 8 ondalık, gereksiz sıfırlar olmadan */
export function formatQuantity(value: number): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: 8 });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** Kâr/zarar: işaretli tutar */
export function formatPnl(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return sign + formatTry(Math.abs(value));
}

export function pnlClass(value: number): string {
  return value > 0 ? 'up' : value < 0 ? 'down' : '';
}

/**
 * Kullanıcının yazdığı sayıyı backend'e gönderilecek biçime çevirir ("0,005" → "0.005").
 * Geçersizse null. Number'a çevrilmez: 8 ondalıklı adetlerde kayan nokta hatası olmasın.
 */
export function parseDecimal(input: string, maxFraction: number): string | null {
  const normalized = input.trim().replace(',', '.');
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxFraction}})?$`);
  if (!pattern.test(normalized) || Number(normalized) <= 0) return null;
  return normalized;
}

/** TRY tutarından adet: aşağı yuvarlanır ki tutar aşılmasın */
export function quantityFromAmount(amount: number, price: number): string {
  const quantity = Math.floor((amount / price) * 1e8) / 1e8;
  return quantity.toFixed(8).replace(/\.?0+$/, '');
}

export const sideLabel: Record<OrderSide, string> = { BUY: 'Alış', SELL: 'Satış' };
export const typeLabel: Record<OrderType, string> = { MARKET: 'Piyasa', LIMIT: 'Limit', STOP: 'Stop' };
export const statusLabel: Record<OrderStatus, string> = {
  OPEN: 'Bekliyor',
  EXECUTING: 'İşleniyor',
  COMPLETED: 'Gerçekleşti',
  REJECTED: 'Reddedildi',
  FAILED: 'Başarısız',
  CANCELLED: 'İptal',
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
