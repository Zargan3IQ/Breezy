"use client";

import { AxiosError } from 'axios';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ComposePost from '@/components/feed/ComposePost';
import PostCard from '@/components/feed/PostCard';
import { useAuth } from '@/context/AuthContext';
import { Post, Reply, mapBackendPost, mapBackendComment } from '@/types/post';
import {
  fetchFeedPosts,
  fetchUserLikedPostIds,
  createPost,
  likePost,
  unlikePost,
  createComment,
} from '@/lib/api/posts';
import { fetchPublicUserById } from '@/lib/api/users';
import { fetchProfileById, fetchFollowingById } from '@/lib/api/profile';
import { uploadMedia } from '@/lib/api/media';

export default function HomeFeed() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation('common');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const isPageLoading = authLoading || (Boolean(user) && isLoading);

  useEffect(() => {
    // Wait for auth to resolve before doing anything
    if (authLoading) return;

    if (!user) return;

    async function loadFeed() {
      try {
        const [followingIds, likedIds] = await Promise.all([
          fetchFollowingById(user!.id),
          fetchUserLikedPostIds(user!.id),
        ]);

        const allIds = [...new Set([user!.id, ...followingIds])];
        const backendPosts = await fetchFeedPosts(allIds);
        const likedSet = new Set(likedIds);

        // Fetch usernames and avatars for authors that are not the current user
        const otherAuthorIds = [...new Set(
          backendPosts.map((p) => p.authorId).filter((id) => id !== user!.id)
        )];
        const [userResults, profileResults] = await Promise.all([
          Promise.allSettled(otherAuthorIds.map(fetchPublicUserById)),
          Promise.allSettled(otherAuthorIds.map(fetchProfileById)),
        ]);
        const authorMap = new Map<string, string>();
        const avatarMap = new Map<string, string | null | undefined>();
        userResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            authorMap.set(otherAuthorIds[i], result.value.username);
          }
        });
        profileResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            avatarMap.set(otherAuthorIds[i], result.value.avatar_url ?? null);
          }
        });

        setPosts(backendPosts.map((bp) => mapBackendPost(bp, likedSet, user!, authorMap, avatarMap)));
      } catch {
        setError(t('home_page.load_error'));
      } finally {
        setIsLoading(false);
      }
    }

    loadFeed();
  }, [user, authLoading, t]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleCreatedPost = (event: WindowEventMap['breezy:post-created']) => {
      const newPost = mapBackendPost(event.detail, new Set(), user);
      setPosts((currentPosts) => [newPost, ...currentPosts.filter((post) => post.id !== newPost.id)]);
      setPostError(null);
    };

    window.addEventListener('breezy:post-created', handleCreatedPost);
    return () => window.removeEventListener('breezy:post-created', handleCreatedPost);
  }, [user]);

  const handleAddNewPost = async (content: string, image: File | null) => {
    if (!user) return;
    setIsPosting(true);
    setPostError(null);
    try {
      const tags = [...new Set(
        [...content.matchAll(/\B#(\w+)/g)].map((m) => m[1].toLowerCase())
      )];
      let uploadedImageUrl: string | null = null;
      if (image) {
        const {url} = await uploadMedia(image);
        uploadedImageUrl = url;
      }
      const bp = await createPost(content, tags.length > 0 ? tags : undefined, uploadedImageUrl);
      const newPost = mapBackendPost(bp, new Set(), user);
      setPosts((prev) => [newPost, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof AxiosError && typeof err.response?.data === 'object' && err.response?.data !== null && 'message' in err.response.data
        ? String(err.response.data.message)
        : t('compose_post.publish_error');
      setPostError(message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked ?? false;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !wasLiked, likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    );

    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: wasLiked, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 }
            : p
        )
      );
    }
  };

  const handleReply = async (postId: string, replyContent: string, image: File | null) => {
    if (!user) return;
    try {
      let uploadedImageUrl: string | null = null;
      if (image) {
        const { url } = await uploadMedia(image);
        uploadedImageUrl = url;
      }
      const bc = await createComment(postId, replyContent, uploadedImageUrl);
      const newReply: Reply = mapBackendComment(bc, user);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, replies: [...(p.replies ?? []), newReply], commentsCount: p.commentsCount + 1 }
            : p
        )
      );
    } catch {
      // silently fail
    }
  };

  return (
    <main className="w-full border-x app-border app-page min-h-screen">
      <header className="sticky top-0 z-10 app-header backdrop-blur-md border-b app-border p-4">
        <h1 className="text-xl font-bold">{t('home_page.title')}</h1>
      </header>

      <ComposePost onPost={handleAddNewPost} isPosting={isPosting} />

      {postError && (
        <p className="text-center text-red-500 py-2 px-4 text-sm">{postError}</p>
      )}

      {isPageLoading && (
        <p className="text-center app-text-soft py-8">{t('pending')}</p>
      )}

      {error && (
        <p className="text-center text-red-500 py-8">{error}</p>
      )}

      {!isPageLoading && !error && posts.length === 0 && (
        <p className="text-center app-text-soft py-16">{t('home_page.empty_message')}</p>
      )}

      <section className="px-10 py-5 space-y-5">
        {posts.map((post) => {
          const PostCardAny = PostCard as any;
          return (
            <PostCardAny
              key={post.id}
              post={post}
              onLike={() => handleToggleLike(post.id)}
              onReply={(content: string, image: File | null) => handleReply(post.id, content, image)}
            />
          );
        })}
      </section>
    </main>
  );
}
