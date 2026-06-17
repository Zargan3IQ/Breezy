import api from '../api';
import type { BackendFollowing, BackendProfile } from '@/types/profile';

export async function fetchProfileById(userId: string): Promise<BackendProfile> {
  const res = await api.get<BackendProfile>(`/profile/${userId}`);
  return res.data;
}

export async function fetchFollowingById(userId: string): Promise<string[]> {
  const res = await api.get<BackendFollowing>(`/profile/${userId}/following`);
  return res.data.following;
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  await api.post('/profile/follow', {
    follower_id: followerId,
    following_id: followingId,
  });
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await api.post('/profile/unfollow', {
    follower_id: followerId,
    following_id: followingId,
  });
}