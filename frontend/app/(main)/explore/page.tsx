"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/feed/PostCard';
import Avatar from '@/components/ui/Avatar';
import { Post, Reply, mapBackendPost, mapBackendComment } from '@/types/post';
import {
  searchPosts,
  fetchPostsByTag,
  fetchUserLikedPostIds,
  likePost,
  unlikePost,
  createComment,
} from '@/lib/api/posts';
import { searchUsers, fetchPublicUserById } from '@/lib/api/users';
import { fetchProfileById } from '@/lib/api/profile';
import { uploadMedia } from '@/lib/api/media';

type PersonResult = { id: string; username: string; avatarUrl?: string | null };
type SearchMode = 'idle' | 'tags' | 'normal';

function ExplorePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [inputValue, setInputValue] = useState(query);
  const [activeTab, setActiveTab] = useState<'posts' | 'people'>('posts');
  const [searchMode, setSearchMode] = useState<SearchMode>('idle');
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichPosts = useCallback(
    async (backendPosts: Awaited<ReturnType<typeof searchPosts>>, likedIds: string[]) => {
      if (!user) return [];
      const likedSet = new Set(likedIds);
      const otherAuthorIds = [...new Set(backendPosts.map((p) => p.authorId).filter((id) => id !== user.id))];
      const [userResults, profileResults] = await Promise.all([
        Promise.allSettled(otherAuthorIds.map(fetchPublicUserById)),
        Promise.allSettled(otherAuthorIds.map(fetchProfileById)),
      ]);
      const authorMap = new Map<string, string>();
      const avatarMap = new Map<string, string | null | undefined>();
      userResults.forEach((r, i) => { if (r.status === 'fulfilled') authorMap.set(otherAuthorIds[i], r.value.username); });
      profileResults.forEach((r, i) => { if (r.status === 'fulfilled') avatarMap.set(otherAuthorIds[i], r.value.avatar_url ?? null); });
      return backendPosts.map((bp) => mapBackendPost(bp, likedSet, user, authorMap, avatarMap));
    },
    [user]
  );

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !user) return;
      setIsLoading(true);
      setError(null);

      try {
        if (q.startsWith('#')) {
          const tag = q.slice(1).toLowerCase().trim();
          setSearchMode('tags');
          const [backendPosts, likedIds] = await Promise.all([
            fetchPostsByTag(tag),
            fetchUserLikedPostIds(user.id),
          ]);
          setPosts(await enrichPosts(backendPosts, likedIds));
          setPeople([]);
        } else {
          setSearchMode('normal');
          const [backendPosts, userResults, likedIds] = await Promise.all([
            searchPosts(q),
            searchUsers(q),
            fetchUserLikedPostIds(user.id),
          ]);
          setPosts(await enrichPosts(backendPosts, likedIds));

          const profileResults = await Promise.allSettled(userResults.map((u) => fetchProfileById(u.id)));
          setPeople(
            userResults.map((u, i) => ({
              id: u.id,
              username: u.username,
              avatarUrl: profileResults[i].status === 'fulfilled' ? profileResults[i].value.avatar_url ?? null : null,
            }))
          );
        }
      } catch {
        setError(t('explore_page.search_error'));
      } finally {
        setIsLoading(false);
      }
    },
    [user, enrichPosts, t]
  );

  useEffect(() => {
    if (authLoading) return;
    if (query) {
      const timer = window.setTimeout(() => {
        void runSearch(query);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [authLoading, query, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    router.push(`/explore?q=${encodeURIComponent(q)}`);
    runSearch(q);
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked ?? false;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isLiked: !wasLiked, likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1 } : p
      )
    );
    try {
      if (wasLiked) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isLiked: wasLiked, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 } : p
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
          p.id === postId ? { ...p, replies: [...(p.replies ?? []), newReply], commentsCount: p.commentsCount + 1 } : p
        )
      );
    } catch {
      // silently fail
    }
  };

  return (
    <main className="w-full border-x app-border app-page min-h-screen">
      <header className="sticky top-0 z-10 app-header backdrop-blur-md border-b app-border p-4">
        <h1 className="text-xl font-bold">{t('explore_page.title')}</h1>
      </header>

      {/* Search bar */}
      <div className="p-4 border-b app-border">
        <form onSubmit={handleSubmit} className="search-bar">
          <Search size={16} className="app-text-muted shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('explore_page.search_placeholder')}
            className="bg-transparent border-none outline-none w-full text-sm app-text"
          />
        </form>
      </div>

      {/* Tabs (normal search only) */}
      {searchMode === 'normal' && (
        <div className="flex border-b app-border">
          {(['posts', 'people'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-brand text-brand'
                  : 'app-text-muted app-hover-surface'
              }`}
            >
              {t(`explore_page.tabs.${tab}`)}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-center app-text-soft py-8">{t('pending')}</p>
      )}

      {/* Error */}
      {!isLoading && error && (
        <p className="text-center text-red-500 py-8">{error}</p>
      )}

      {/* Tag results */}
      {!isLoading && !error && searchMode === 'tags' && (
        posts.length === 0
          ? <p className="text-center app-text-soft py-16">{t('explore_page.no_results_tags')}</p>
          : (
            <section className="px-10 py-5 space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleToggleLike(post.id)}
                  onReply={(content: string, image: File | null) => handleReply(post.id, content, image)}
                />
              ))}
            </section>
          )
      )}

      {/* Normal search — Posts tab */}
      {!isLoading && !error && searchMode === 'normal' && activeTab === 'posts' && (
        posts.length === 0
          ? <p className="text-center app-text-soft py-16">{t('explore_page.no_results_posts')}</p>
          : (
            <section className="px-10 py-5 space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleToggleLike(post.id)}
                  onReply={(content: string, image: File | null) => handleReply(post.id, content, image)}
                />
              ))}
            </section>
          )
      )}

      {/* Normal search — People tab */}
      {!isLoading && !error && searchMode === 'normal' && activeTab === 'people' && (
        people.length === 0
          ? <p className="text-center app-text-soft py-16">{t('explore_page.no_results_people')}</p>
          : (
            <section className="divide-y divide-[var(--app-border-subtle)]">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/profile/${encodeURIComponent(person.username)}`}
                  className="flex items-center gap-3 px-6 py-4 app-hover-surface transition-colors"
                >
                  <Avatar src={person.avatarUrl} alt={person.username} size="md" />
                  <div>
                    <p className="font-semibold text-sm">{person.username}</p>
                    <p className="app-text-muted text-sm">@{person.username.toLowerCase()}</p>
                  </div>
                </Link>
              ))}
            </section>
          )
      )}
    </main>
  );
}

export default function ExplorePageWrapper() {
  return (
    <Suspense>
      <ExplorePage />
    </Suspense>
  );
}
