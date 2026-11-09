import { request } from './client';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type OrderStatus = 'OPEN' | 'EXECUTING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

export interface PriceTicker {
  symbol: string;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  quoteVolume24h: number;
  updatedAt: string;
}

export interface Candle {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoOrder {
  id: number;
  userId: number;
  accountNumber: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  triggerPrice: number | null;
  executedPrice: number | null;
  totalAmount: number | null;
  status: OrderStatus;
  failureCode: string | null;
  failureReason: string | null;
  walletAttempts: number;
  walletReference: string;
  createdAt: string;
  updatedAt: string;
  executedAt: string | null;
}

export interface Position {
  symbol: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  currentPrice: number | null;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
}

export interface Portfolio {
  positions: Position[];
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  /** Adet; sayı yerine string gönderilir ki 8 ondalık hassasiyet kaybolmasın */
  quantity: string;
  triggerPrice?: string;
  accountNumber: string;
}

/** crypto-service. Fiyat uçları token istemez; alım-satım uçları ister. */
export const cryptoApi = {
  /** Canlı akış: EventSource header gönderemediği için bu uç herkese açıktır */
  priceStreamUrl: '/api/crypto/prices/stream',

  getPrices: () => request<PriceTicker[]>('/api/crypto/prices', { auth: false }),

  getCandles: (symbol: string, interval: string, limit: number) =>
    request<Candle[]>(`/api/crypto/prices/${symbol}/candles`, { auth: false, query: { interval, limit } }),

  placeOrder: (data: PlaceOrderRequest) => request<CryptoOrder>('/api/crypto/orders', { method: 'POST', body: data }),

  getOrders: (status?: OrderStatus) =>
    request<CryptoOrder[]>('/api/crypto/orders', { query: status ? { status } : undefined }),

  cancelOrder: (id: number) => request<CryptoOrder>(`/api/crypto/orders/${id}`, { method: 'DELETE' }),

  getPortfolio: () => request<Portfolio>('/api/crypto/portfolio'),
};
