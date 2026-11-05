import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { walletApi, type Account } from '../api/walletApi';
import { useAuth } from '../auth/AuthContext';

/** Giriş yapmış kullanıcının hesaplarını yükler; reload() ile yeniden çeker */
export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return [];
    setError(null);
    try {
      const list = await walletApi.getAccounts(user.id);
      list.sort((a, b) => a.id - b.id);
      setAccounts(list);
      return list;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hesaplar yüklenemedi.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { accounts, loading, error, reload };
}
