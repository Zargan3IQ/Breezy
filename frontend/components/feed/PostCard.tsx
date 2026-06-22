"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, MoreHorizontal, Image as ImageIcon, X, Check, Crop as CropIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from "@/components/ui/Avatar";
import Button from '@/components/ui/Button';
import ContextMenu from "@/components/ui/ContextMenu";
import { useAuth } from '@/context/AuthContext';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { createPostReport } from '@/lib/api/posts';
import { Post, ReportReason } from '@/types/post';

const REPORT_REASONS: ReportReason[] = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'other'];

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onReply: (content: string, image: File | null) => void;
  onEdit?: (postId: string, newContent: string, newImage: File | null) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  disableNavigation?: boolean;
  isPosting?: boolean; // Nouveau prop pour indiquer si une action de publication est en cours
}

export default function PostCard({ post, onLike, onReply, onEdit, onDelete, disableNavigation, isPosting = false }: PostCardProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 3. State pour stocker l'URL temporaire de l'aperçu
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Pour recadrage de l'image
  const [srcUrl, setSrcUrl] = useState<string | null>(null); // Image brute lue par le FileReader
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null); // Référence à l'image pour le recadrage

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Générer ou nettoyer l'URL de preview quand le fichier change
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    // Crée l'URL locale
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Nettoyage de la mémoire quand le composant se démonte ou change de fichier
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Changement ici : On ne déclenche plus la modale automatiquement
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file); // L'image s'affiche directement dans la preview
    }
  };

  // Nouvelle fonction pour déclencher manuellement le recadrage depuis l'aperçu
  const handleTriggerCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setSrcUrl(reader.result as string);
      setIsCropping(true);
    });
    reader.readAsDataURL(selectedFile);
  };

  // Centre automatiquement le carré de sélection au chargement
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  };

  // Transforme la sélection en un nouveau fichier binaire (Blob)
  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          // Crée le fichier final prêt pour ton API Gateway / Media Service
          const croppedFile = new File([blob], 'cropped-image.jpeg', { type: 'image/jpeg' });
          setSelectedFile(croppedFile);
          setIsCropping(false);
          setSrcUrl(null);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // 5. Fonction pour retirer l'image sélectionnée
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset l'input pour pouvoir ré-uploader la même image au besoin
    }
  };

  const TRUNCATE_LIMIT = 140;
  const isTruncatable = post.content.length > TRUNCATE_LIMIT;
  const displayContent = isTruncatable && !expanded
    ? post.content.slice(0, TRUNCATE_LIMIT) + '…'
    : post.content;

  const submitReply = () => {
    if (replyText.trim().length === 0 && !selectedFile) return;
    onReply(replyText, selectedFile);
    setReplyText('');
    setIsReplying(false);
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    await onEdit(post.id, editContent.trim(), selectedFile);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (disableNavigation) return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea, video')) return; // Ajout de video ici pour éviter les conflits au clic sur les contrôles du lecteur
    router.push(`/posts/${post.id}`);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!onDelete) return;
    if (!window.confirm(t('post_card.delete_confirm'))) return;
    await onDelete(post.id);
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

  const isVideo = selectedFile?.type.startsWith('video/');
  const isGif = selectedFile?.type === 'image/gif';

  // Détermination dynamique du type de fichier (Image ou Vidéo)
  const isVideoUrl = post.imageUrl
    ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(post.imageUrl)
    : false;

  return (
    <article
      className={`relative app-surface-elevated border app-border p-4 app-hover-surface transition-colors rounded-lg${disableNavigation ? '' : ' cursor-pointer'}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link href={profileHref} aria-label={t('accessibility.view_profile', { username: post.author.username })}>
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
                ariaLabel={t('accessibility.post_options')}
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
                <div
                  className="text-brand cursor-pointer hover:opacity-80 p-1 rounded-full hover:bg-brand/10 transition-colors"
                  onClick={handleIconClick}>
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm"
                    className="hidden"
                  />
                </div>
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
              {previewUrl && selectedFile && (
                <div className="relative my-3 w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 group">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      muted
                      className="w-full h-full object-contain max-h-[50vh]"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain max-h-[50vh]"
                    />
                  )}

                  {/* Boutons d'actions superposés */}
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    {/* On n'affiche le bouton Crop que si ce n'est ni une vidéo, ni un GIF */}
                    {!isVideo && !isGif && (
                      <button
                        type="button"
                        onClick={handleTriggerCrop}
                        className="p-1.5 rounded-full bg-black/70 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                        title="Recadrer l'image"
                      >
                        <CropIcon size={18} />
                      </button>
                    )}

                    {/* Bouton de suppression */}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-full bg-black/70 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                      title="Supprimer le média"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
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

          {/* Zone d'affichage adaptative Image OU Vidéo */}
          {post.imageUrl && (
            <div className="mt-3 w-full overflow-hidden border border-gray-100 rounded-2xl flex justify-center items-center">
              {isVideoUrl ? (
                <video
                  src={post.imageUrl}
                  controls
                  preload="metadata"
                  className="w-full object-contain max-h-[50vh]"
                />
              ) : (
                <img
                  src={post.imageUrl}
                  alt="Contenu du post"
                  className="w-full object-contain max-h-[50vh]"
                  loading="lazy"
                />
              )}
            </div>
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
            <div className="flex flex-col">
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('post_card.reply_placeholder')}
                  className="inline-input flex-1"
                />
                <div
                  className="text-brand cursor-pointer hover:opacity-80 p-1 rounded-full hover:bg-brand/10 transition-colors"
                  onClick={handleIconClick}
                >
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm"
                    className="hidden"
                  />
                </div>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim() && !selectedFile}
                  className="bg-brand text-white px-4 py-1 rounded-full text-sm font-bold disabled:opacity-50"
                >
                  {t('post_card.reply_button')}
                </button>
              </div>
              {previewUrl && selectedFile && (
                <div className="relative my-3 w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 group">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      muted
                      className="w-full h-full object-contain max-h-[50vh]"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain max-h-[50vh]"
                    />
                  )}

                  {/* Boutons d'actions superposés */}
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    {/* On n'affiche le bouton Crop que si ce n'est ni une vidéo, ni un GIF */}
                    {!isVideo && !isGif && (
                      <button
                        type="button"
                        onClick={handleTriggerCrop}
                        className="p-1.5 rounded-full bg-black/70 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                        title="Recadrer l'image"
                      >
                        <CropIcon size={18} />
                      </button>
                    )}

                    {/* Bouton de suppression */}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-full bg-black/70 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                      title="Supprimer le média"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reportFeedback && (
            <p className={`mt-3 text-sm ${reportFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {reportFeedback.message}
            </p>
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

      {isCropping && srcUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold mb-3 text-gray-900">{t('edit.ajust_image')}</h3>
            <div className="overflow-auto flex-1 flex justify-center items-center bg-gray-100 rounded-xl p-2">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16 / 9}
              >
                <img
                  ref={imgRef}
                  src={srcUrl}
                  alt="Crop target"
                  onLoad={onImageLoad}
                  className="max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setIsCropping(false); setSrcUrl(null); }}
                className="px-4 py-2 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t('edit.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-full text-sm font-semibold flex items-center gap-1"
              >
                <Check size={16} /> {t('edit.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
};