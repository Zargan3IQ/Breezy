"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import { Reply } from '@/types/post';

interface CommentCardProps {
  comment: Reply;
  onLike?: () => void;
  onUnlike?: () => void;
  onReply?: (content: string) => void;
  disableNavigation?: boolean;
}

export default function CommentCard({ comment, onLike, onUnlike, onReply, disableNavigation }: CommentCardProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const profileHref = `/profile/${encodeURIComponent(comment.author.username)}`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (disableNavigation) return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
    router.push(`/comments/${comment.id}`);
  };

  const handleToggleLike = () => {
    if (comment.isLiked) onUnlike?.();
    else onLike?.();
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply?.(replyText.trim());
    setReplyText('');
    setIsReplying(false);
  };

  return (
    <article
      className={`bg-white border-b border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors${disableNavigation ? '' : ' cursor-pointer'}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link href={profileHref} aria-label={`View profile of ${comment.author.username}`}>
            <Avatar src={comment.author.avatarUrl} alt={comment.author.username} size="sm" />
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm">
            <Link href={profileHref} className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{comment.author.name}</span>
              <span className="text-gray-500">@{comment.author.username}</span>
            </Link>
          </div>

          <p className="mt-1 text-gray-900 text-[15px] whitespace-pre-wrap wrap-break-word">{comment.content}</p>

          <div className="flex items-center gap-6 mt-2">
            {onReply !== undefined && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="post-action hover:text-blue-500"
              >
                <MessageCircle size={16} />
                <span className="text-sm">{comment.commentsCount}</span>
              </button>
            )}

            {(onLike !== undefined || onUnlike !== undefined) && (
              <button
                onClick={handleToggleLike}
                className={`post-action ${comment.isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
              >
                <Heart size={16} className={comment.isLiked ? 'fill-red-500' : ''} />
                <span className="text-sm">{comment.likesCount}</span>
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-3 flex gap-2">
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
        </div>
      </div>
    </article>
  );
}
