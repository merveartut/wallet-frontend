const plainNumber = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Tutarı para birimiyle biçimlendirir: 1234.5 + TRY → "₺1.234,50".
 * Eski otomatik hesaplarda para birimi "TR" gibi geçersiz bir kod olabilir;
 * Intl bu durumda hata verdiği için sayı + kod olarak gösterilir.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  } catch {
    return `${plainNumber.format(amount)} ${currency}`;
  }
}

/**
 * Kullanıcının yazdığı tutarı sayıya çevirir. "1234,56" ve "1234.56" kabul edilir,
 * en fazla 2 ondalık basamak. Geçersizse null döner.
 */
export function parseAmount(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return value > 0 ? value : null;
}
