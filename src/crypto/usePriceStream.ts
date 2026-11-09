import { useEffect, useRef, useState } from 'react';
import { cryptoApi, type PriceTicker } from '../api/cryptoApi';

export type Tick = 'up' | 'down';

interface PriceStreamState {
  prices: PriceTicker[];
  bySymbol: Record<string, PriceTicker>;
  /** Son güncellemede fiyat yükseldi mi düştü mü (yanıp sönme efekti için) */
  ticks: Record<string, { direction: Tick; seq: number }>;
  connected: boolean;
}

/**
 * Canlı fiyatlar (Server-Sent Events).
 * EventSource bağlantı koparsa kendiliğinden yeniden bağlanır; bu sürede son fiyatlar ekranda kalır.
 */
export function usePriceStream(): PriceStreamState {
  const [state, setState] = useState<PriceStreamState>({ prices: [], bySymbol: {}, ticks: {}, connected: false });
  const seq = useRef(0);

  useEffect(() => {
    const source = new EventSource(cryptoApi.priceStreamUrl);

    source.addEventListener('prices', (event) => {
      const prices = JSON.parse((event as MessageEvent<string>).data) as PriceTicker[];
      setState((prev) => {
        const ticks = { ...prev.ticks };
        for (const p of prices) {
          const old = prev.bySymbol[p.symbol];
          if (old && old.price !== p.price) {
            seq.current += 1;
            ticks[p.symbol] = { direction: p.price > old.price ? 'up' : 'down', seq: seq.current };
          }
        }
        return {
          prices,
          bySymbol: Object.fromEntries(prices.map((p) => [p.symbol, p])),
          ticks,
          connected: true,
        };
      });
    });
    source.onerror = () => setState((prev) => ({ ...prev, connected: false }));

    return () => source.close();
  }, []);

  return state;
}
