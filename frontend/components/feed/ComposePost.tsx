"use client";

import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Check, Crop as CropIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ComposePostProps {
  onPost: (content: string, image: File | null) => Promise<void>;
  isPosting?: boolean;
}

export default function ComposePost({ onPost, isPosting = false }: ComposePostProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
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

  const handleIconClick = () => {
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
  const handleTriggerCrop = () => {
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
  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset l'input pour pouvoir ré-uploader la même image au besoin
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // On permet de poster si le texte n'est pas vide OU si une image/vidéo est présente
    if ((content.trim().length === 0 && !selectedFile) || isPosting) return;

    await onPost(content, selectedFile);
    setContent('');
    setSelectedFile(null);
  };

  const isVideo = selectedFile?.type.startsWith('video/');
  const isGif = selectedFile?.type === 'image/gif';

  return (
    <div className="border-b app-border p-4 px-12">
      <div className="flex gap-3">
        <Avatar
          src={user?.avatarUrl}
          alt={t('accessibility.avatar_self')}
          size="md"
        />
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('compose_post.placeholder')}
            className="w-full bg-transparent text-xl outline-none resize-none min-h-15 app-text placeholder:app-text-muted"
            maxLength={280}
          />

          {/* 6. Zone d'aperçu adaptative (S'affiche uniquement si un média est chargé) */}
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

          <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
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
            <Button
              type="submit"
              disabled={(content.trim().length === 0 && !selectedFile) || isPosting}
              className="bg-brand hover:bg-brand-hover text-white font-bold py-1.5 px-4 rounded-full disabled:opacity-50"
            >
              {isPosting ? t('compose_post.publishing') : t('compose_post.submit_button')}
            </Button>
          </div>
        </form>
      </div>
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
    </div>
  );
}