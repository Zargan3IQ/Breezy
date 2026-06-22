"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from "@/components/ui/Avatar";
import ContextMenu from "@/components/ui/ContextMenu";
import { useAuth } from '@/context/AuthContext';
import { createPostReport } from '@/lib/api/posts';
import { Post, ReportReason } from '@/types/post';

const REPORT_REASONS: ReportReason[] = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'other'];

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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const profileHref = `/profile/${encodeURIComponent(post.author.username)}`;
  const avatarSrc = post.author.id === user?.id ? (user.avatarUrl ?? post.author.avatarUrl) : post.author.avatarUrl;
  const isAuthor = post.author.id === user?.id;
  const showAuthorMenu = isAuthor && (onEdit !== undefined || onDelete !== undefined);
  const canReport = !!user && !isAuthor;
  const showMenu = showAuthorMenu || canReport;

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

  const openReportDialog = () => {
    setReportReason('spam');
    setReportFeedback(null);
    setIsReporting(true);
  };

  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    setReportFeedback(null);

    try {
      await createPostReport(post.id, reportReason);
      setIsReporting(false);
      setReportFeedback({ type: 'success', message: t('post_card.report_success') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('post_card.report_error');
      setReportFeedback({ type: 'error', message });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const menuActions = [
    ...(showAuthorMenu
      ? [
          ...(onEdit ? [{ label: t('post_card.edit'), onClick: () => { setIsEditing(true); setEditContent(post.content); } }] : []),
          ...(onDelete ? [{ label: t('post_card.delete'), onClick: () => { if (window.confirm(t('post_card.delete_confirm'))) onDelete(post.id); }, danger: true }] : []),
        ]
      : []),
    ...(canReport ? [{ label: t('post_card.report'), onClick: openReportDialog, danger: true }] : []),
  ];

  return (
    <article
      className={`relative app-surface-elevated border app-border p-4 app-hover-surface transition-colors rounded-lg${disableNavigation ? '' : ' cursor-pointer'}`}
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
              <span className="font-bold app-text">{post.author.name}</span>
              <span className="app-text-muted">@{post.author.username}</span>
            </Link>

            {showMenu && (
              <ContextMenu
                ariaLabel="Post options"
                actions={menuActions}
              />
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-lg border app-input p-2 text-sm outline-none focus:border-teal-500"
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
                  className="rounded-full border app-border px-4 py-1 text-sm font-semibold app-text app-hover-surface"
                >
                  {t('post_card.cancel_edit')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 app-text text-[15px] whitespace-pre-wrap wrap-break-word">{displayContent}</p>
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

          {reportFeedback && (
            <p className={`mt-3 text-sm ${reportFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {reportFeedback.message}
            </p>
          )}

          {post.replies && post.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 app-border space-y-3">
              {post.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <span className="font-bold mr-2">{reply.author.name}</span>
                  <span className="app-text-muted">{reply.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isReporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setIsReporting(false)}>
          <div className="w-full max-w-sm rounded-2xl border app-border app-surface-elevated p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold app-text">{t('post_card.report_title')}</h3>
            <p className="mt-1 text-sm app-text-muted">{t('post_card.report_description')}</p>

            <label className="mt-4 block text-sm font-medium app-text">
              {t('post_card.report_reason_label')}
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportReason)}
                className="mt-2 w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
                disabled={isSubmittingReport}
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`post_card.report_reasons.${reason}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReporting(false)}
                className="rounded-full border app-border px-4 py-2 text-sm font-semibold app-text app-hover-surface"
                disabled={isSubmittingReport}
              >
                {t('post_card.cancel_edit')}
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmittingReport ? t('pending') : t('post_card.report_submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
