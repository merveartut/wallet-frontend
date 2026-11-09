import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { cryptoApi, type CryptoOrder, type Portfolio } from '../api/cryptoApi';

/** Portföy ve emirler; bekleyen emirler arka planda tetiklenebildiği için düzenli yenilenir */
export function useCryptoAccount(pollMs = 5000) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<CryptoOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([cryptoApi.getPortfolio(), cryptoApi.getOrders()]);
      setPortfolio(p);
      setOrders(o);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Portföy yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(timer);
  }, [reload, pollMs]);

  return { portfolio, orders, error, reload };
}
