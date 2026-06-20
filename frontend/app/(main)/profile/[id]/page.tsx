"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import PostCard from '@/components/feed/PostCard';
import FollowListModal from '@/components/profile/FollowListModal';
import { useAuth } from '@/context/AuthContext';
import { createComment, fetchPosts, fetchPostsByIds, fetchUserLikedPostIds, likePost, unlikePost, updatePost, deletePost, fetchCommentsByUser, fetchPostById } from '@/lib/api/posts';
import { fetchFollowingById, fetchProfileById, followUser, unfollowUser, updateProfile } from '@/lib/api/profile';
import { uploadMedia, deleteMedia, ALLOWED_AVATAR_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/api/media';
import { fetchPublicUserById, fetchPublicUserByUsername } from '@/lib/api/users';
import { Post, Reply, BackendComment, BackendPost, mapBackendComment, mapBackendPost } from '@/types/post';
import { User } from '@/types/user';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const routeUsername = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isLoading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(['common', 'profile']);
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
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [userComments, setUserComments] = useState<BackendComment[]>([]);
  const [postMap, setPostMap] = useState<Map<string, BackendPost>>(new Map());
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !routeUsername) {
      return;
    }

    const currentUser = user;

    async function loadProfilePage() {
      try {
        setIsLoading(true);
        setError(null);
        setActiveTab('posts');
        setRepliesLoaded(false);
        setUserComments([]);
        setPostMap(new Map());
        setLikesLoaded(false);
        setLikedPosts([]);

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
        setError(t('profile:error_message'));
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

  const handleEditPost = async (postId: string, newContent: string) => {
    const tags = [...new Set([...newContent.matchAll(/\B#(\w+)/g)].map((m) => m[1].toLowerCase()))];
    const bp = await updatePost(postId, newContent, tags.length > 0 ? tags : []);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: bp.content, tags: bp.tags } : p));
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const loadReplies = async (profileId: string) => {
    setIsLoadingReplies(true);
    try {
      const comments = await fetchCommentsByUser(profileId);
      setUserComments(comments);

      const uniquePostIds = [...new Set(comments.map(c => c.post_id))];
      const postResults = await Promise.allSettled(uniquePostIds.map(fetchPostById));
      const map = new Map<string, BackendPost>();
      postResults.forEach((r, i) => {
        if (r.status === 'fulfilled') map.set(uniquePostIds[i], r.value.post);
      });
      setPostMap(map);
      setRepliesLoaded(true);
    } catch {
      // fail silently
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const loadLikedPosts = async (profileId: string) => {
    setIsLoadingLikes(true);
    try {
      const likedIds = await fetchUserLikedPostIds(profileId);
      const backendPosts = await fetchPostsByIds(likedIds);

      const uniqueAuthorIds = [...new Set(backendPosts.map(p => p.authorId))];
      const [userResults, profileResults] = await Promise.all([
        Promise.allSettled(uniqueAuthorIds.map(fetchPublicUserById)),
        Promise.allSettled(uniqueAuthorIds.map(fetchProfileById)),
      ]);

      const authorMap = new Map<string, string>();
      const avatarMap = new Map<string, string>();
      uniqueAuthorIds.forEach((id, i) => {
        if (userResults[i].status === 'fulfilled') authorMap.set(id, userResults[i].value.username);
        if (profileResults[i].status === 'fulfilled') avatarMap.set(id, profileResults[i].value.avatar_url ?? '');
      });

      const likedSet = new Set(likedIds);
      const mapped = backendPosts.map(bp => {
        const username = authorMap.get(bp.authorId) ?? bp.authorId;
        const avatarUrl = avatarMap.get(bp.authorId) ?? '';
        const post = mapBackendPost(bp, likedSet, user!, authorMap);
        return { ...post, author: { id: bp.authorId, name: username, username, avatarUrl } };
      });

      setLikedPosts(mapped);
      setLikesLoaded(true);
    } catch {
      // fail silently
    } finally {
      setIsLoadingLikes(false);
    }
  };

  const handleTabChange = (tab: 'posts' | 'replies' | 'likes') => {
    setActiveTab(tab);
    if (tab === 'replies' && !repliesLoaded && profileUser) {
      loadReplies(profileUser.id);
    }
    if (tab === 'likes' && !likesLoaded && profileUser) {
      loadLikedPosts(profileUser.id);
    }
  };

  const handleToggleLikedPost = async (postId: string) => {
    const post = likedPosts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked ?? true;

    setLikedPosts(prev =>
      wasLiked
        ? prev.filter(p => p.id !== postId)
        : prev.map(p => p.id === postId ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p)
    );

    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch {
      setLikedPosts(prev =>
        wasLiked
          ? [post, ...prev]
          : prev.map(p => p.id === postId ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p)
      );
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
      setAvatarError(t('profile:avatar.error_format'));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setAvatarError(t('profile:avatar.error_size'));
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
      let msg = t('profile:avatar.error_upload');
      if (err && typeof err === 'object') {
        const axErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        if (axErr.response) {
          const serverMsg = axErr.response.data?.message;
          msg = serverMsg
            ? t('profile:avatar.error_server_with_msg', { status: axErr.response.status, message: serverMsg })
            : t('profile:avatar.error_server_no_msg', { status: axErr.response.status });
        } else if (axErr.message) {
          msg = t('profile:avatar.error_network', { message: axErr.message });
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
        <h1 className="text-xl font-bold text-gray-900">{t('profile:header_title')}</h1>
      </header>

      {isLoading && <p className="px-4 py-8 text-center text-gray-400">{t('profile:loading_message')}</p>}

      {isProfileUnavailable && <p className="px-4 py-8 text-center text-red-500">{t('profile:unavailable_message')}</p>}

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
                        {isUploadingAvatar ? t('profile:avatar.uploading') : t('profile:avatar.change')}
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
                  {isFollowPending ? t('pending') : isFollowing ? t('profile:follow_button.unfollow') : t('profile:follow_button.follow')}
                </Button>
              )}

              <div className="flex gap-6 text-sm text-gray-600">
                <p>
                  <span className="font-bold text-gray-900">{posts.length}</span> {t('profile:stats.posts')}
                </p>
                <button
                  onClick={() => setFollowModal('followers')}
                  className="hover:underline text-left"
                >
                  <span className="font-bold text-gray-900">{profileUser.followersCount ?? 0}</span> {t('profile:stats.followers')}
                </button>
                <button
                  onClick={() => setFollowModal('following')}
                  className="hover:underline text-left"
                >
                  <span className="font-bold text-gray-900">{profileUser.followingCount ?? 0}</span> {t('profile:stats.following')}
                </button>
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

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('posts')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'posts' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('profile:tabs.posts')}
            </button>
            <button
              onClick={() => handleTabChange('replies')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'replies' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('profile:tabs.posts_replies')}
            </button>
            <button
              onClick={() => handleTabChange('likes')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'likes' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('profile:tabs.likes')}
            </button>
          </div>

          {activeTab === 'posts' && (
            <section>
              {posts.length === 0 && (
                <p className="px-4 py-10 text-center text-gray-500">{t('profile:empty_posts_message')}</p>
              )}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleToggleLike(post.id)}
                  onReply={(content: string) => handleReply(post.id, content)}
                  {...(isOwnProfile && { onEdit: handleEditPost, onDelete: handleDeletePost })}
                />
              ))}
            </section>
          )}

          {activeTab === 'likes' && (
            <section>
              {isLoadingLikes && (
                <p className="px-4 py-10 text-center text-gray-400">{t('pending')}</p>
              )}
              {!isLoadingLikes && likedPosts.length === 0 && (
                <p className="px-4 py-10 text-center text-gray-500">{t('profile:empty_likes_message')}</p>
              )}
              {!isLoadingLikes && likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleToggleLikedPost(post.id)}
                  onReply={(content: string) => handleReply(post.id, content)}
                />
              ))}
            </section>
          )}

          {activeTab === 'replies' && (
            <section>
              {isLoadingReplies && (
                <p className="px-4 py-10 text-center text-gray-400">{t('pending')}</p>
              )}
              {!isLoadingReplies && userComments.length === 0 && (
                <p className="px-4 py-10 text-center text-gray-500">{t('profile:empty_replies_message')}</p>
              )}
              {!isLoadingReplies && userComments.map((comment) => {
                const originalPost = postMap.get(comment.post_id);
                return (
                  <div key={comment._id} className="border-b border-gray-100 px-4 py-3 hover:bg-gray-50">
                    {originalPost && (
                      <button
                        onClick={() => router.push(`/posts/${comment.post_id}`)}
                        className="mb-2 w-full text-left px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 line-clamp-2 hover:bg-gray-100 transition-colors"
                      >
                        {originalPost.content.length > 100
                          ? originalPost.content.slice(0, 100) + '…'
                          : originalPost.content}
                      </button>
                    )}
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <Avatar src={profileUser?.avatarUrl} alt={profileUser?.username ?? ''} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-bold text-gray-900">{profileUser?.name}</span>
                          <span className="text-gray-500">@{profileUser?.username}</span>
                        </div>
                        <p className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
      {followModal && profileUser && (
        <FollowListModal
          userId={profileUser.id}
          type={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </main>
  );
}