"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import PostCard from '@/components/feed/PostCard';
import { useAuth } from '@/context/AuthContext';
import { createComment, fetchPosts, fetchUserLikedPostIds, likePost, unlikePost } from '@/lib/api/posts';
import { fetchFollowingById, fetchProfileById, followUser, unfollowUser, updateProfile } from '@/lib/api/profile';
import { uploadMedia, deleteMedia, ALLOWED_AVATAR_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/api/media';
import { fetchPublicUserByUsername } from '@/lib/api/users';
import { Post, Reply, mapBackendComment, mapBackendPost } from '@/types/post';
import { User } from '@/types/user';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const routeUsername = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isLoading: authLoading, updateUser } = useAuth();
  const { t } = useTranslation('common');
  const isProfileUnavailable = !authLoading && (!user || !routeUsername);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

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
          avatarUrl: backendProfile?.avatar_url ?? publicUser.avatarUrl,
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

  const isOwnProfile = !!user && !!profileUser && user.id === profileUser.id;

  const handleSaveBio = async () => {
    if (!user || !profileUser) return;
    setIsSavingBio(true);
    try {
      await updateProfile(user.id, { bio: bioInput });
      setProfileUser((prev) => (prev ? { ...prev, bio: bioInput } : prev));
      setIsEditingBio(false);
    } catch {
      // Save failed silently — user can retry
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profileUser) return;

    setAvatarError(null);

    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError('Format non supporté. Utilisez JPG, PNG, WebP ou GIF.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setAvatarError('Image trop lourde. Maximum 15 Mo.');
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { url } = await uploadMedia(file);

      const oldUrl = profileUser.avatarUrl;
      if (oldUrl && oldUrl.includes('/breezy-media/')) {
        const oldObjectName = oldUrl.split('/').pop();
        if (oldObjectName) await deleteMedia(oldObjectName).catch(() => {});
      }

      await updateProfile(user.id, { avatar_url: url });
      setProfileUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      updateUser({ avatarUrl: url });
    } catch (err: unknown) {
      console.error('[Avatar upload]', err);
      let msg = 'Échec du téléchargement. Veuillez réessayer.';
      if (err && typeof err === 'object') {
        const axErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        if (axErr.response) {
          const serverMsg = axErr.response.data?.message;
          msg = serverMsg
            ? `Erreur ${axErr.response.status} : ${serverMsg}`
            : `Erreur HTTP ${axErr.response.status}.`;
        } else if (axErr.message) {
          msg = `Erreur réseau : ${axErr.message}`;
        }
      }
      setAvatarError(msg);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
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
                {isOwnProfile ? (
                  <label htmlFor="avatar-upload" className="relative cursor-pointer group shrink-0">
                    <Avatar src={profileUser.avatarUrl} alt={profileUser.username} size="xl" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-semibold text-center leading-tight px-1">
                        {isUploadingAvatar ? 'Envoi...' : 'Changer'}
                      </span>
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept={ALLOWED_AVATAR_TYPES.join(',')}
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                ) : (
                  <Avatar src={profileUser.avatarUrl} alt={profileUser.username} size="xl" />
                )}
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

            {avatarError && <p className="mt-2 text-sm text-red-500">{avatarError}</p>}

            <div className="mt-4">
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={160}
                    rows={3}
                    autoFocus
                    className="w-full max-w-2xl resize-none rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-teal-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={isSavingBio}
                      className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingBio ? '...' : t('profile.save')}
                    </button>
                    <button
                      onClick={() => { setIsEditingBio(false); setBioInput(profileUser.bio ?? ''); }}
                      className="rounded-full border border-gray-300 px-4 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {t('profile.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className={`max-w-2xl whitespace-pre-wrap text-sm ${profileUser.bio ? 'text-gray-700' : 'italic text-gray-400'}`}>
                    {profileUser.bio || t('profile.no_bio')}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => { setIsEditingBio(true); setBioInput(profileUser.bio ?? ''); }}
                      className="shrink-0 text-xs text-teal-600 hover:underline"
                    >
                      {t('profile.edit_bio')}
                    </button>
                  )}
                </div>
              )}
            </div>
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