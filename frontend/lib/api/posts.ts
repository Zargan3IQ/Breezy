import api from '../api';
import type { BackendPost, BackendComment, BackendReport, ReportReason, ReportStatus } from '@/types/post';

export async function fetchPosts(): Promise<BackendPost[]> {
  const res = await api.get<BackendPost[]>('/posts');
  return res.data;
}

export async function fetchFeedPosts(authorIds: string[]): Promise<BackendPost[]> {
  const res = await api.get<BackendPost[]>('/posts/feed', {
    params: { authorIds: authorIds.join(',') },
  });
  return res.data;
}

export async function fetchUserLikedPostIds(userId: string): Promise<string[]> {
  const res = await api.get<{ liked_posts: string[] }>(`/post-likes/user/${userId}`);
  return res.data.liked_posts.map(String);
}

export async function createPost(content: string, tags?: string[]): Promise<BackendPost> {
  const res = await api.post<BackendPost>('/posts', { content, tags });
  return res.data;
}

export async function likePost(postId: string): Promise<void> {
  await api.post('/post-likes', { post_id: postId });
}

export async function unlikePost(postId: string): Promise<void> {
  await api.delete('/post-likes', { data: { post_id: postId } });
}

export async function updatePost(postId: string, content: string, tags?: string[]): Promise<BackendPost> {
  const res = await api.put<BackendPost>(`/posts/${postId}`, { content, tags });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function searchPosts(q: string): Promise<BackendPost[]> {
  const res = await api.get<BackendPost[]>('/posts/search', { params: { q } });
  return res.data;
}

export async function fetchPostsByTag(tag: string): Promise<BackendPost[]> {
  const res = await api.get<BackendPost[]>(`/posts/tags/${encodeURIComponent(tag)}`);
  return res.data;
}

export async function fetchPostsByIds(ids: string[]): Promise<BackendPost[]> {
  if (ids.length === 0) return [];
  const res = await api.get<BackendPost[]>('/posts/batch', {
    params: { ids: ids.join(',') },
  });
  return res.data;
}

export async function fetchPostById(postId: string): Promise<{ post: BackendPost; replies: BackendPost[] }> {
  const res = await api.get<{ post: BackendPost; replies: BackendPost[] }>(`/posts/${postId}`);
  return res.data;
}

export async function fetchCommentsByUser(userId: string): Promise<BackendComment[]> {
  const res = await api.get<BackendComment[]>(`/comments/user/${userId}`);
  return res.data;
}

export async function fetchComments(postId: string): Promise<BackendComment[]> {
  const res = await api.get<BackendComment[]>(`/comments/post/${postId}`);
  return res.data;
}

export async function createComment(postId: string, content: string, parentCommentId?: string): Promise<BackendComment> {
  const res = await api.post<BackendComment>('/comments', {
    post_id: postId,
    content,
    ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
  });
  return res.data;
}

export async function fetchCommentById(commentId: string): Promise<BackendComment> {
  const res = await api.get<BackendComment>(`/comments/${commentId}`);
  return res.data;
}

export async function fetchCommentReplies(commentId: string): Promise<BackendComment[]> {
  const res = await api.get<BackendComment[]>(`/comments/${commentId}/replies`);
  return res.data;
}

export async function fetchUserLikedCommentIds(userId: string): Promise<string[]> {
  const res = await api.get<{ liked_comments: string[] }>(`/comment-likes/user/${userId}`);
  return res.data.liked_comments.map(String);
}

export async function updateComment(commentId: string, content: string): Promise<BackendComment> {
  const res = await api.put<BackendComment>(`/comments/${commentId}`, { content });
  return res.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export async function likeComment(commentId: string): Promise<void> {
  await api.post('/comment-likes', { comment_id: commentId });
}

export async function unlikeComment(commentId: string): Promise<void> {
  await api.delete('/comment-likes', { data: { comment_id: commentId } });
}

export async function createPostReport(postId: string, reason: ReportReason): Promise<BackendReport> {
  const res = await api.post<BackendReport>('/reports', {
    target_type: 'post',
    target_id: postId,
    reason,
  });
  return res.data;
}

export async function fetchReports(status: ReportStatus = 'pending'): Promise<BackendReport[]> {
  const res = await api.get<BackendReport[]>('/reports', { params: { status } });
  return res.data;
}

export async function updateReportStatus(reportId: string, status: Exclude<ReportStatus, 'pending'>): Promise<BackendReport> {
  const res = await api.patch<BackendReport>(`/reports/${reportId}`, { status });
  return res.data;
}
