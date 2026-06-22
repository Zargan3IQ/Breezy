import api from '../api';
import type { BackendPublicUser, BackendUser, UserRole, UserSearchResult } from '@/types/user';

export async function fetchUserById(id: string): Promise<BackendUser> {
  const res = await api.get<BackendUser>(`/users/${id}`);
  return res.data;
}

export async function fetchPublicUserById(id: string): Promise<BackendPublicUser> {
  const res = await api.get<BackendPublicUser>(`/users/${id}/public`);
  return res.data;
}

export async function fetchPublicUserByUsername(username: string): Promise<BackendPublicUser> {
  const res = await api.get<BackendPublicUser>(`/users/username/${encodeURIComponent(username)}/public`);
  return res.data;
}

export async function updateUserInfos(userId: string, data: { username?: string; email?: string }): Promise<BackendUser> {
  const res = await api.put<BackendUser>(`/users/${userId}`, data);
  return res.data;
}

export async function changeUserEmail(newEmail: string, currentPassword: string): Promise<{ message: string }> {
  const res = await api.patch<{ message: string }>('/auth/email', { newEmail, currentPassword });
  return res.data;
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.patch<{ message: string }>('/auth/password', { currentPassword, newPassword });
  return res.data;
}

export async function searchUsers(q: string, options?: { includeInactive?: boolean }): Promise<UserSearchResult[]> {
  const res = await api.get<UserSearchResult[]>('/users/search', {
    params: {
      q,
      includeInactive: options?.includeInactive ? 'true' : undefined,
    },
  });
  return res.data;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${userId}/role`, { role });
  return res.data;
}

export async function suspendUser(userId: string, until: string, reason?: string): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${userId}/suspend`, { until, reason });
  return res.data;
}

export async function banUser(userId: string, reason?: string): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${userId}/ban`, { reason });
  return res.data;
}

export async function reinstateUser(userId: string): Promise<BackendUser> {
  const res = await api.patch<BackendUser>(`/users/${userId}/reinstate`);
  return res.data;
}
