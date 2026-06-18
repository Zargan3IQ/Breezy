"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import PostCard from '@/components/feed/PostCard';
import { useAuth } from '@/context/AuthContext';
import { createComment, fetchPosts, fetchUserLikedPostIds, likePost, unlikePost } from '@/lib/api/posts';
import { fetchFollowingById, fetchProfileById, followUser, unfollowUser } from '@/lib/api/profile';
import { fetchPublicUserByUsername } from '@/lib/api/users';
import { Post, Reply, mapBackendComment, mapBackendPost } from '@/types/post';
import { User } from '@/types/user';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const routeUsername = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isLoading: authLoading } = useAuth();
  const isProfileUnavailable = !authLoading && (!user || !routeUsername);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !routeUsername) {
      return;
    }

    const currentUser = user;

    async function loadProfilePage() {
      try {
        setIsLoading(true);
        setError(null);

        const publicUser = await fetchPublicUserByUsername(routeUsername);
        const profileId = publicUser.id;

        const [backendPosts, likedIds, backendProfile, currentUserFollowing] = await Promise.all([
          fetchPosts(),
          fetchUserLikedPostIds(currentUser.id),
          fetchProfileById(profileId).catch(() => null),
          fetchFollowingById(currentUser.id).catch((): string[] => []),
        ]);

        const nextProfileUser: User = {
          id: publicUser.id,
          name: publicUser.username,
          username: publicUser.username,
          avatarUrl: backendProfile?.avatar_url ?? publicUser.avatarUrl ?? `https://i.pravatar.cc/150?u=${publicUser.id}`,
          bio: backendProfile?.bio,
          followersCount: backendProfile?.counters?.followers_count,
          followingCount: backendProfile?.counters?.following_count,
        };

        const likedSet = new Set(likedIds);
        const authorMap = new Map<string, string>([[profileId, publicUser.username]]);
        const nextPosts = backendPosts
          .filter((post) => post.authorId === profileId)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .map((post) => ({
            ...mapBackendPost(post, likedSet, currentUser, authorMap),
            author: nextProfileUser,
          }));

        setProfileUser(nextProfileUser);
        setPosts(nextPosts);
        setIsFollowing(currentUserFollowing.includes(profileId));
      } catch {
        setProfileUser(null);
        setPosts([]);
        setError('Impossible de charger ce profil.');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfilePage();
  }, [authLoading, routeUsername, user]);

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((entry) => entry.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked ?? false;

    setPosts((currentPosts) =>
      currentPosts.map((entry) =>
        entry.id === postId
          ? {
              ...entry,
              isLiked: !wasLiked,
              likesCount: wasLiked ? entry.likesCount - 1 : entry.likesCount + 1,
            }
          : entry
      )
    );

    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch {
      setPosts((currentPosts) =>
        currentPosts.map((entry) =>
          entry.id === postId
            ? {
                ...entry,
                isLiked: wasLiked,
                likesCount: wasLiked ? entry.likesCount + 1 : entry.likesCount - 1,
              }
            : entry
        )
      );
    }
  };

  const handleReply = async (postId: string, replyContent: string) => {
    if (!user) return;

    try {
      const backendComment = await createComment(postId, replyContent);
      const newReply: Reply = mapBackendComment(backendComment, user);

      setPosts((currentPosts) =>
        currentPosts.map((entry) =>
          entry.id === postId
            ? {
                ...entry,
                replies: [...(entry.replies ?? []), newReply],
                commentsCount: entry.commentsCount + 1,
              }
            : entry
        )
      );
    } catch {
      // Ignore reply failures for now.
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !profileUser || user.id === profileUser.id || isFollowPending) {
      return;
    }

    const wasFollowing = isFollowing;
    setIsFollowPending(true);
    setIsFollowing(!wasFollowing);
    setProfileUser((currentProfileUser) => {
      if (!currentProfileUser) return currentProfileUser;

      return {
        ...currentProfileUser,
        followersCount: Math.max(0, (currentProfileUser.followersCount ?? 0) + (wasFollowing ? -1 : 1)),
      };
    });

    try {
      if (wasFollowing) {
        await unfollowUser(user.id, profileUser.id);
      } else {
        await followUser(user.id, profileUser.id);
      }
    } catch {
      setIsFollowing(wasFollowing);
      setProfileUser((currentProfileUser) => {
        if (!currentProfileUser) return currentProfileUser;

        return {
          ...currentProfileUser,
          followersCount: Math.max(0, (currentProfileUser.followersCount ?? 0) + (wasFollowing ? 1 : -1)),
        };
      });
    } finally {
      setIsFollowPending(false);
    }
  };

  return (
    <main className="w-full max-w-150 border-x border-gray-200 min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-4 py-4 backdrop-blur-md">
        <h1 className="text-xl font-bold text-gray-900">Profil</h1>
      </header>

      {isLoading && <p className="px-4 py-8 text-center text-gray-400">Chargement du profil...</p>}

      {isProfileUnavailable && <p className="px-4 py-8 text-center text-red-500">Profil indisponible.</p>}

      {error && <p className="px-4 py-8 text-center text-red-500">{error}</p>}

      {!isLoading && !isProfileUnavailable && !error && profileUser && (
        <>
          <section className="border-b border-gray-200 px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                <Avatar src={profileUser.avatarUrl} alt={profileUser.username} size="xl" />
                <div className="min-w-0 pt-2">
                  <h2 className="truncate text-2xl font-black text-gray-900">{profileUser.name}</h2>
                  <p className="text-sm text-gray-500">@{profileUser.username}</p>
                </div>
              </div>

              {user && user.id !== profileUser.id && (
                <Button
                  type="button"
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="md"
                  disabled={isFollowPending}
                  onClick={handleToggleFollow}
                  className="sm:self-start"
                >
                  {isFollowPending ? 'Chargement...' : isFollowing ? 'Ne plus suivre' : 'Suivre'}
                </Button>
              )}

              <div className="flex gap-6 text-sm text-gray-600">
                <p>
                  <span className="font-bold text-gray-900">{posts.length}</span> posts
                </p>
                <p>
                  <span className="font-bold text-gray-900">{profileUser.followersCount ?? 0}</span> abonnés
                </p>
                <p>
                  <span className="font-bold text-gray-900">{profileUser.followingCount ?? 0}</span> abonnements
                </p>
              </div>
            </div>

            {profileUser.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm text-gray-700">{profileUser.bio}</p>}
          </section>

          <section>
            {posts.length === 0 && (
              <p className="px-4 py-10 text-center text-gray-500">Cet utilisateur n&apos;a pas encore publié de post.</p>
            )}

            {posts.map((post) => {
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleToggleLike(post.id)}
                  onReply={(content: string) => handleReply(post.id, content)}
                />
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}