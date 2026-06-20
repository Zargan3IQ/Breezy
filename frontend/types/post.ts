import { User } from './user';
import type { AuthUser } from '@/context/AuthContext';

export interface Reply {
  id: string;
  author: User;
  content: string;
  postId: string;
  parentCommentId?: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  tags?: string[];
  imageUrl?: string;
  repostsCount: number;
  isLiked?: boolean;
  replies?: Reply[];
}

// Raw shapes returned by the backend API
export interface BackendPost {
  _id: string;
  authorId: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  tags?: string[];
  createdAt: string;
}

export interface BackendComment {
  _id: string;
  user_id: string;
  post_id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  parent_comment_id?: string | null;
}

export function mapBackendPost(
  bp: BackendPost,
  likedIds: Set<string>,
  currentUser: AuthUser,
  authorMap: Map<string, string> = new Map(),
  avatarMap: Map<string, string | null | undefined> = new Map(),
): Post {
  const isCurrentUser = bp.authorId === currentUser.id;
  const username = isCurrentUser
    ? currentUser.username
    : (authorMap.get(bp.authorId) ?? bp.authorId);
  const avatarUrl = isCurrentUser ? currentUser.avatarUrl : avatarMap.get(bp.authorId);
  const author: User = {
    id: bp.authorId,
    name: username,
    username,
    avatarUrl,
  };

  return {
    id: bp._id,
    author,
    content: bp.content,
    createdAt: bp.createdAt,
    likesCount: bp.likesCount,
    commentsCount: bp.commentsCount,
    tags: bp.tags,
    repostsCount: 0,
    isLiked: likedIds.has(bp._id),
  };
}

export function mapBackendComment(
  bc: BackendComment,
  currentUser: AuthUser,
  authorMap: Map<string, string> = new Map(),
  avatarMap: Map<string, string | null | undefined> = new Map(),
): Reply {
  const isCurrentUser = bc.user_id === currentUser.id;
  const username = isCurrentUser
    ? currentUser.username
    : (authorMap.get(bc.user_id) ?? bc.user_id);
  const avatarUrl = isCurrentUser ? currentUser.avatarUrl : avatarMap.get(bc.user_id);
  return {
    id: bc._id,
    author: { id: bc.user_id, name: username, username, avatarUrl },
    content: bc.content,
    postId: bc.post_id,
    parentCommentId: bc.parent_comment_id,
    likesCount: bc.likesCount ?? 0,
    commentsCount: bc.commentsCount ?? 0,
    isLiked: false,
  };
}
