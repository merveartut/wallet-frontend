import { tokenStorage } from '../auth/tokenStorage';

/** Backend'in RFC 9457 Problem Details cevabındaki alan hatası */
export interface FieldError {
  field: string;
  message: string;
}

/** Backend'in hata cevabı (application/problem+json) */
interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errorCode?: string;
  errors?: FieldError[];
}

/** Tüm API hataları bu tipe çevrilir; sayfalar yalnızca bunu bilir. */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, errorCode?: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
  }

  /** Alan hatalarını { alanAdı: mesaj } biçimine çevirir (form alanlarının altında göstermek için). */
  fieldErrorMap(): Record<string, string> {
    return Object.fromEntries(this.fieldErrors.map((e) => [e.field, e.message]));
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Oturumlu bir istek 401 alırsa çağrılır (token süresi dolmuş veya geçersiz). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number>;
  /** false ise Authorization header'ı eklenmez (giriş, kayıt) */
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const url = new URL(path, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const headers: Record<string, string> = { Accept: 'application/json, application/problem+json, text/plain' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = auth ? tokenStorage.get() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı. İnternet bağlantınızı ve backend servislerinin çalıştığını kontrol edin.');
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw error;
  }

  return (await readBody(response)) as T;
}

/**
 * Backend bazı endpoint'lerde JSON, bazılarında düz metin dönüyor (bkz. backend yapılacaklar #20).
 * Düz metin dönen endpoint'ler (ör. login'deki token) Accept header'ına göre "application/json"
 * etiketiyle de gelebiliyor; bu yüzden içerik JSON olarak çözülemezse metin olarak döndürülür.
 */
async function readBody(response: Response): Promise<unknown> {
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json') && body) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

async function toApiError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      const problem = (await response.json()) as ProblemDetail;
      // Gateway'in kendi hataları (ör. 503) Problem Details değildir; detail alanı olmayabilir
      if (problem.detail || problem.errorCode) {
        return new ApiError(response.status, problem.detail ?? defaultMessage(response.status),
          problem.errorCode, problem.errors ?? []);
      }
    } catch {
      // gövde okunamadıysa varsayılan mesaja düş
    }
  }
  return new ApiError(response.status, defaultMessage(response.status));
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.';
    case 403:
      return 'Bu işlem için yetkiniz yok.';
    case 404:
      return 'İstenen kayıt bulunamadı.';
    case 502:
    case 503:
    case 504:
      return 'Servis şu anda kullanılamıyor. Servisler yeni başlatıldıysa birkaç saniye sonra tekrar deneyin.';
    default:
      return status >= 500 ? 'Beklenmeyen bir sunucu hatası oluştu.' : 'İstek işlenemedi.';
  }
}
