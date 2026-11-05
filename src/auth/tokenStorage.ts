const KEY = 'wallet.token';

/**
 * Token'ı tarayıcıda saklar. localStorage sekme kapansa da oturumu korur.
 * Not: localStorage'daki token XSS saldırısında okunabilir; üretimde HttpOnly cookie tercih edilir
 * (bunun için backend'in token'ı cookie ile vermesi gerekir).
 */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // gizli pencere vb.: oturum yalnızca bu sayfa açıkken sürer
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // yok say
    }
  },
};
