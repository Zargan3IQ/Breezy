import { User } from './user';

export interface Reply {
  id: string;
  author: User;
  content: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  tags?: string[]; // Fx12: Optional tags
  imageUrl?: string; // Fx13: Optional image URL
  repostsCount: number; // Fx14: Reposts count

  isLiked?: boolean; 
  replies?: Reply[];
}