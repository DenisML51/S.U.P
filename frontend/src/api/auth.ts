import { apiFetch } from './client';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
};

export type RegisterRequestResponse = {
  requiresEmailVerification: boolean;
  message?: string;
  accessToken?: string;
  user?: AuthUser;
};

export const requestRegistrationCode = (name: string, email: string, password: string) =>
  apiFetch<RegisterRequestResponse>('/auth/register/request-code', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

export const verifyRegistrationCode = (email: string, code: string) =>
  apiFetch<{ accessToken: string; user: AuthUser }>('/auth/register/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });

export const loginApi = (email: string, password: string) =>
  apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

export const fetchMe = () => apiFetch<{ user: AuthUser }>('/auth/me');

export const logoutApi = () =>
  apiFetch<{ ok: boolean }>('/auth/logout', {
    method: 'POST'
  });
