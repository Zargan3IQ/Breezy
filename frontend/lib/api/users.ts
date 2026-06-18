import api from '../api';
import type { BackendPublicUser, BackendUser } from '@/types/user';

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
