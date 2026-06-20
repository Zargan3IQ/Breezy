"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from "@/components/ui/Avatar";
import { useAuth } from '@/context/AuthContext';
import { Post } from '@/types/post';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onReply: (content: string) => void;
  onEdit?: (postId: string, newContent: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  disableNavigation?: boolean;
}

export default function PostCard({ post, onLike, onReply, onEdit, onDelete, disableNavigation }: PostCardProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const profileHref = `/profile/${encodeURIComponent(post.author.username)}`;
  const avatarSrc = post.author.id === user?.id ? (user.avatarUrl ?? post.author.avatarUrl) : post.author.avatarUrl;
  const isAuthor = post.author.id === user?.id;
  const showAuthorMenu = isAuthor && (onEdit !== undefined || onDelete !== undefined);

  const TRUNCATE_LIMIT = 140;
  const isTruncatable = post.content.length > TRUNCATE_LIMIT;
  const displayContent = isTruncatable && !expanded
    ? post.content.slice(0, TRUNCATE_LIMIT) + '…'
    : post.content;

  const submitReply = () => {
    if (replyText.trim().length === 0) return;
    onReply(replyText);
    setReplyText('');
    setIsReplying(false);
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    await onEdit(post.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (disableNavigation) return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
    router.push(`/posts/${post.id}`);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!onDelete) return;
    if (!window.confirm(t('post_card.delete_confirm'))) return;
    await onDelete(post.id);
  };

  return (
    <article
      className={`relative bg-white border border-gray-200 p-4 hover:bg-gray-50 transition-colors rounded-lg${disableNavigation ? '' : ' cursor-pointer'}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link href={profileHref} aria-label={`Voir le profil de ${post.author.username}`}>
            <Avatar src={avatarSrc} alt={post.author.username} size="md" />
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link href={profileHref} className="flex items-center gap-1 text-sm">
              <span className="font-bold text-gray-900">{post.author.name}</span>
              <span className="text-gray-500">@{post.author.username}</span>
            </Link>

            {showAuthorMenu && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Post options"
                >
                  <MoreHorizontal size={16} />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-7 z-20 min-w-27.5 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {onEdit && (
                      <button
                        onClick={() => { setIsEditing(true); setEditContent(post.content); setIsMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                      >
                        {t('post_card.edit')}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg"
                      >
                        {t('post_card.delete')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-teal-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t('post_card.save')}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-full border border-gray-300 px-4 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {t('post_card.cancel_edit')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap wrap-break-word">{displayContent}</p>
              {isTruncatable && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-brand text-sm font-semibold mt-1 hover:underline"
                >
                  {expanded ? t('post_card.show_less') : t('post_card.show_more')}
                </button>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-8 mt-3">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="post-action hover:text-blue-500"
            >
              <MessageCircle size={18} />
              <span className="text-sm">{post.commentsCount}</span>
            </button>

            <button
              onClick={onLike}
              className={`post-action ${post.isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart size={18} className={post.isLiked ? 'fill-red-500' : ''} />
              <span className="text-sm">{post.likesCount}</span>
            </button>
          </div>

          {isReplying && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('post_card.reply_placeholder')}
                className="inline-input"
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="bg-brand text-white px-4 py-1 rounded-full text-sm font-bold disabled:opacity-50"
              >
                {t('post_card.reply_button')}
              </button>
            </div>
          )}

          {post.replies && post.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {post.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <span className="font-bold mr-2">{reply.author.name}</span>
                  <span className="text-gray-700">{reply.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
