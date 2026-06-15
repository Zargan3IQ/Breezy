
export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
}
