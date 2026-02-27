import { apiFetch } from './client';
import type { LobbyMessage, LobbyStatePayload } from '../types/lobby';

export const createLobbyApi = (payload?: { settings?: Record<string, unknown>; characterId?: string }) =>
  apiFetch<LobbyStatePayload>('/lobbies', {
    method: 'POST',
    body: JSON.stringify(payload ?? {})
  });

export const joinLobbyApi = (key: string, characterId?: string) =>
  apiFetch<LobbyStatePayload>('/lobbies/join', {
    method: 'POST',
    body: JSON.stringify({ key, characterId })
  });

export const leaveLobbyApi = (key: string) =>
  apiFetch<{ ok: boolean }>('/lobbies/leave', {
    method: 'POST',
    body: JSON.stringify({ key })
  });

export const getLobbyApi = (key: string) => apiFetch<LobbyStatePayload>(`/lobbies/${encodeURIComponent(key)}`);

export const sendMasterMessageApi = (key: string, text: string) =>
  apiFetch<{ message: LobbyMessage }>(`/lobbies/${encodeURIComponent(key)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });

export const sendMasterNotificationApi = (key: string, text: string, title?: string) =>
  apiFetch<{ ok: boolean; notificationId: string }>(`/lobbies/${encodeURIComponent(key)}/notify`, {
    method: 'POST',
    body: JSON.stringify({ text, title })
  });
