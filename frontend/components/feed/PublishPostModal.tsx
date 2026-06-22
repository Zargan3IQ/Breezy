'use client';

import { AxiosError } from 'axios';
import { useState } from 'react';
import { Image as ImageIcon, Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { createPost } from '../../lib/api/posts';
import type { BackendPost } from '../../types/post';

type TriggerVariant = 'sidebar' | 'mobile';

interface PublishPostModalProps {
  triggerVariant: TriggerVariant;
}

declare global {
  interface WindowEventMap {
    'breezy:post-created': CustomEvent<BackendPost>;
  }
}

export default function PublishPostModal({ triggerVariant }: PublishPostModalProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingCharacters = 280 - content.length;

  const closeModal = () => {
    if (isPosting) return;
    setIsOpen(false);
    setContent('');
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || content.trim().length === 0 || isPosting) {
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const tags = [...new Set([...content.matchAll(/\B#(\w+)/g)].map((match) => match[1].toLowerCase()))];
      const newPost = await createPost(content, tags.length > 0 ? tags : undefined);
      window.dispatchEvent(new CustomEvent('breezy:post-created', { detail: newPost }));
      closeModal();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof AxiosError
        && typeof caughtError.response?.data === 'object'
        && caughtError.response?.data !== null
        && 'message' in caughtError.response.data
        ? String(caughtError.response.data.message)
        : t('compose_post.publish_error');
      setError(message);
      setIsPosting(false);
      return;
    }

    setIsPosting(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {triggerVariant === 'sidebar' ? (
        <Button className="mt-6" variant="primary" size="lg" onClick={() => setIsOpen(true)}>
          <Plus size={20} className="block lg:hidden" />
          <span className="hidden lg:block">{t('sidebar.post_button')}</span>
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-brand text-white rounded-full p-2 hover:bg-brand-hover transition-colors"
          aria-label={t('sidebar.post_button')}
        >
          <Plus size={24} />
        </button>
      )}

        {typeof document !== 'undefined' && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center app-overlay px-4 py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border app-border app-surface-elevated shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between border-b app-border px-6 py-4">
              <div>
                <h2 className="text-xl font-black app-text">{t('compose_post.modal_title')}</h2>
                <p className="mt-1 text-sm app-text-muted">{t('compose_post.modal_description')}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPosting}
                className="rounded-full p-2 app-text-muted transition-colors hover:app-text app-hover-surface disabled:cursor-not-allowed"
                aria-label={t('compose_post.close')}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="flex gap-4">
                <Avatar src={user.avatarUrl} alt={t('accessibility.avatar_self')} size="md" />
                <div className="min-w-0 flex-1">
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={t('compose_post.placeholder')}
                    className="min-h-40 w-full resize-none rounded-[1.5rem] border app-input px-5 py-4 text-base outline-none transition-colors placeholder:app-text-muted focus:border-teal-500"
                    maxLength={280}
                    autoFocus
                  />

                  <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.5rem] border app-border-subtle app-surface-muted px-4 py-3">
                    <div className="flex items-center gap-3 text-sm app-text-muted">
                      <ImageIcon size={18} className="text-brand" />
                      <span>
                        {t(
                          remainingCharacters === 1
                            ? 'compose_post.characters_left_one'
                            : 'compose_post.characters_left_other',
                          { count: remainingCharacters }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="button" variant="ghost" onClick={closeModal} disabled={isPosting}>
                        {t('compose_post.cancel')}
                      </Button>
                      <Button type="submit" disabled={content.trim().length === 0 || isPosting}>
                        {isPosting ? t('compose_post.publishing') : t('compose_post.submit_button')}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}