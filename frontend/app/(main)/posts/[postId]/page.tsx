"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PostCard from '@/components/feed/PostCard';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { Post, Reply, mapBackendPost, mapBackendComment } from '@/types/post';
import {
  fetchPostById,
  fetchComments,
  fetchUserLikedPostIds,
  likePost,
  unlikePost,
  createComment,
} from '@/lib/api/posts';
import { fetchPublicUserById } from '@/lib/api/users';
import { fetchProfileById } from '@/lib/api/profile';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation('common');

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !postId) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const [{ post: bp }, likedIds, backendComments] = await Promise.all([
          fetchPostById(postId),
          fetchUserLikedPostIds(user!.id),
          fetchComments(postId),
        ]);

        // Enrich post author if not the current user
        const postAuthorIds = bp.authorId !== user!.id ? [bp.authorId] : [];
        const [postUserResults, postProfileResults] = await Promise.all([
          Promise.allSettled(postAuthorIds.map(fetchPublicUserById)),
          Promise.allSettled(postAuthorIds.map(fetchProfileById)),
        ]);
        const authorMap = new Map<string, string>();
        const avatarMap = new Map<string, string | null | undefined>();
        postUserResults.forEach((r, i) => {
          if (r.status === 'fulfilled') authorMap.set(postAuthorIds[i], r.value.username);
        });
        postProfileResults.forEach((r, i) => {
          if (r.status === 'fulfilled') avatarMap.set(postAuthorIds[i], r.value.avatar_url ?? null);
        });

        setPost(mapBackendPost(bp, new Set(likedIds), user!, authorMap, avatarMap));

        // Enrich comment authors
        const commentAuthorIds = [...new Set(
          backendComments.map(c => c.user_id).filter(id => id !== user!.id)
        )];
        const [cUserResults, cProfileResults] = await Promise.all([
          Promise.allSettled(commentAuthorIds.map(fetchPublicUserById)),
          Promise.allSettled(commentAuthorIds.map(fetchProfileById)),
        ]);
        const cAuthorMap = new Map<string, string>();
        const cAvatarMap = new Map<string, string | null | undefined>();
        cUserResults.forEach((r, i) => {
          if (r.status === 'fulfilled') cAuthorMap.set(commentAuthorIds[i], r.value.username);
        });
        cProfileResults.forEach((r, i) => {
          if (r.status === 'fulfilled') cAvatarMap.set(commentAuthorIds[i], r.value.avatar_url ?? null);
        });

        setComments(backendComments.map(bc => mapBackendComment(bc, user!, cAuthorMap, cAvatarMap)));
      } catch {
        setError('Failed to load post.');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [user, authLoading, postId]);

  const handleToggleLike = async () => {
    if (!post) return;
    const wasLiked = post.isLiked ?? false;
    setPost(prev => prev ? { ...prev, isLiked: !wasLiked, likesCount: wasLiked ? prev.likesCount - 1 : prev.likesCount + 1 } : prev);
    try {
      if (wasLiked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      setPost(prev => prev ? { ...prev, isLiked: wasLiked, likesCount: wasLiked ? prev.likesCount + 1 : prev.likesCount - 1 } : prev);
    }
  };

  const handleReply = async (content: string) => {
    if (!user || !post) return;
    try {
      const bc = await createComment(post.id, content);
      const newComment = mapBackendComment(bc, user);
      setComments(prev => [newComment, ...prev]);
      setPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev);
    } catch {
      // silently fail
    }
  };

  return (
    <main className="w-full border-x border-gray-200 min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </header>

      {isLoading && <p className="text-center text-gray-400 py-8">{t('pending')}</p>}
      {error && <p className="text-center text-red-500 py-8">{error}</p>}

      {!isLoading && !error && post && (
        <>
          <div className="px-4 py-4 border-b border-gray-200">
            <PostCard
              post={post}
              onLike={handleToggleLike}
              onReply={handleReply}
              disableNavigation
            />
          </div>

          <section>
            {comments.length === 0 && (
              <p className="text-center text-gray-400 py-10">{t('post_card.no_comments')}</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                <div className="shrink-0">
                  <Avatar src={comment.author.avatarUrl} alt={comment.author.username} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-bold text-gray-900">{comment.author.name}</span>
                    <span className="text-gray-500">@{comment.author.username}</span>
                  </div>
                  <p className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
