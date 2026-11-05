/** Backend'in ürettiği JWT'deki alanlar (bkz. common-security JwtService) */
export interface TokenClaims {
  sub: string; // kullanıcı adı
  userId: number;
  role: string; // USER | ADMIN
  iat: number;
  exp: number; // saniye cinsinden bitiş zamanı
}

/**
 * Token'ın içeriğini okur. İmzayı DOĞRULAMAZ: bu yalnızca arayüzde kullanıcı adını,
 * rolü ve süreyi göstermek içindir. Asıl doğrulamayı her istekte backend yapar.
 */
export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as TokenClaims;
    if (typeof claims.userId !== 'number' || typeof claims.exp !== 'number') {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/** Token'ın süresi doldu mu (saat farkları için birkaç saniye pay bırakır)? */
export function isExpired(claims: TokenClaims, skewSeconds = 5): boolean {
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
