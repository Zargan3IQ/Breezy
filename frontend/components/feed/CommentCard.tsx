"use client";

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, ImageIcon, Crop as CropIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import { Reply } from '@/types/post';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';

interface CommentCardProps {
  comment: Reply;
  onLike?: () => void;
  onUnlike?: () => void;
  onReply?: (content: string, media: File | null) => void; // Ajout du média ici
  disableNavigation?: boolean;
  isPosting?: boolean;
}

export default function CommentCard({ comment, onLike, onUnlike, onReply, disableNavigation, isPosting = false }: CommentCardProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const profileHref = `/profile/${encodeURIComponent(comment.author.username)}`;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Pour recadrage de l'image
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Générer ou nettoyer l'URL de preview quand le fichier change
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

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

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  };

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
          const croppedFile = new File([blob], 'cropped-image.jpeg', { type: 'image/jpeg' });
          setSelectedFile(croppedFile);
          setIsCropping(false);
          setSrcUrl(null);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- FONCTIONS CORRIGÉES ET AJOUTÉES À L'INTÉRIEUR DU COMPOSANT ---
  const handleCardClick = () => {
    if (disableNavigation) return;
    router.push(`/comments/${comment.id}`);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (comment.isLiked) {
      onUnlike?.();
    } else {
      onLike?.();
    }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    onReply(replyText, selectedFile);
    setReplyText('');
    setSelectedFile(null);
    setIsReplying(false);
  };

  const isVideo = selectedFile?.type.startsWith('video/');
  const isGif = selectedFile?.type === 'image/gif';

  const isVideoUrl = comment.imageUrl
    ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(comment.imageUrl)
    : false;

  return (
    <article
      className={`app-surface border-b app-border-subtle px-4 py-3 app-hover-surface transition-colors${disableNavigation ? '' : ' cursor-pointer'}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link href={profileHref} aria-label={t('accessibility.view_profile', { username: comment.author.username })}>
            <Avatar src={comment.author.avatarUrl} alt={comment.author.username} size="sm" />
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm">
            <Link href={profileHref} className="flex items-center gap-1">
              <span className="font-bold app-text">{comment.author.name}</span>
              <span className="app-text-muted">@{comment.author.username}</span>
            </Link>
          </div>

          <p className="mt-1 app-text text-[15px] whitespace-pre-wrap wrap-break-word">{comment.content}</p>

          {comment.imageUrl && (
            <div className="mt-3 w-full overflow-hidden border border-gray-100 rounded-2xl flex justify-center items-center">
              {isVideoUrl ? (
                <video
                  src={comment.imageUrl}
                  controls
                  preload="metadata"
                  className="w-full object-contain max-h-[30vh]"
                />
              ) : (
                <img
                  src={comment.imageUrl}
                  alt="Contenu du comment"
                  className="w-full object-contain max-h-[30vh]"
                  loading="lazy"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-6 mt-2">
            {onReply !== undefined && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsReplying(!isReplying); }}
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
            <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('post_card.reply_placeholder')}
                  className="inline-input"
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
                  disabled={!replyText.trim() || isPosting}
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

                  <div className="absolute top-2 right-2 flex gap-2 z-10">
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
        </div>
      </div>
    </article>
  );
} // 👈 L'accolade ferme bien le composant tout à la fin maintenant !