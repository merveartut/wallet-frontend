import { request } from './client';

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: 'USER' | 'ADMIN' | string;
}

export interface Account {
  id: number;
  accountNumber: string;
  currency: string;
  balance: number;
  userId: number;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
}

/** Backend endpoint'leri. Tüm istekler Vite proxy → API Gateway (8080) üzerinden gider. */
export const walletApi = {
  register: (data: RegisterRequest) =>
    request<User>('/api/users/register', { method: 'POST', body: data, auth: false }),

  /** JWT'yi düz metin olarak döner */
  login: (username: string, password: string) =>
    request<string>('/api/users/login', { method: 'POST', body: { username, password }, auth: false }),

  getUser: (id: number) => request<User>(`/api/users/${id}`),

  getAccounts: (userId: number) => request<Account[]>(`/api/account/user/${userId}`),

  /** Hesap her zaman token sahibine açılır; başarı mesajını düz metin döner */
  createAccount: (currency: string) =>
    request<string>('/api/account/accounts', { method: 'POST', query: { currency } }),

  /** Yalnızca ADMIN: sistemdeki tüm hesaplar */
  getAllAccounts: () => request<Account[]>('/api/account/accounts'),

  /** Yalnızca ADMIN */
  deposit: (accountNumber: string, amount: number) =>
    request<string>('/api/account/deposit', { method: 'POST', query: { accountNumber, amount } }),

  transfer: (data: TransferRequest) =>
    request<string>('/api/account/transfer', { method: 'POST', body: data }),
};
