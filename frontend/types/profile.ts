export interface BackendProfileCounters {
  followers_count: number;
  following_count: number;
}

export interface BackendProfile {
  user_id: string;
  bio?: string;
  avatar_url?: string;
  counters?: BackendProfileCounters | null;
}

export interface BackendFollowing {
  user_id: string;
  following: string[];
}