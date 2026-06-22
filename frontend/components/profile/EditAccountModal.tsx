"use client";

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import type { AuthUser } from '@/context/AuthContext';
import { changeUserEmail, changeUserPassword, updateUserInfos } from '@/lib/api/users';

interface EditAccountModalProps {
  user: AuthUser;
  onClose: () => void;
  onSaved: (data: { username: string; email: string; passwordChanged: boolean }) => Promise<void> | void;
}

export default function EditAccountModal({ user, onClose, onSaved }: EditAccountModalProps) {
  const { t } = useTranslation('profile');
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const usernameChanged = trimmedUsername !== user.username;
  const emailChanged = normalizedEmail !== user.email;
  const passwordChanged = newPassword.length > 0;
  const needsCurrentPassword = emailChanged || passwordChanged;

  const canSubmit = useMemo(() => {
    return !isSaving;
  }, [isSaving]);

  const getErrorMessage = (err: unknown) => {
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      if (response?.data?.message) {
        return response.data.message;
      }
    }

    if (err instanceof Error && err.message) {
      return err.message;
    }

    return t('account_modal.error_no_changes', { defaultValue: 'No changes to save.' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!usernameChanged && !emailChanged && !passwordChanged) {
      setError(t('account_modal.error_no_changes', { defaultValue: 'No changes to save.' }));
      return;
    }

    if (!trimmedUsername) {
      setError(t('account_modal.error_username_required', { defaultValue: 'Username cannot be empty.' }));
      return;
    }

    if (needsCurrentPassword && !currentPassword) {
      setError(t('account_modal.error_required_password', { defaultValue: 'Current password is required to change email or password.' }));
      return;
    }

    if (passwordChanged && newPassword.length < 8) {
      setError(t('account_modal.error_password_length', { defaultValue: 'The new password must contain at least 8 characters.' }));
      return;
    }

    if (passwordChanged && newPassword !== confirmPassword) {
      setError(t('account_modal.error_password_mismatch', { defaultValue: 'New passwords do not match.' }));
      return;
    }

    setIsSaving(true);

    try {
      if (usernameChanged) {
        await updateUserInfos(user.id, { username: trimmedUsername });
      }

      if (emailChanged) {
        await changeUserEmail(normalizedEmail, currentPassword);
      }

      if (passwordChanged) {
        await changeUserPassword(currentPassword, newPassword);
      }

      const successMessage = passwordChanged
        ? t('account_modal.password_success', { defaultValue: 'Password updated. Please log in again.' })
        : t('account_modal.success', { defaultValue: 'Account updated.' });

      setSuccess(successMessage);
      await onSaved({
        username: trimmedUsername,
        email: normalizedEmail,
        passwordChanged,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center app-overlay px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border app-border app-surface-elevated shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b app-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold app-text">
              {t('account_modal.title', { defaultValue: 'Edit account details' })}
            </h2>
            <p className="mt-1 text-sm app-text-muted">
              {t('account_modal.description', { defaultValue: 'Update your username, email, or password.' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 app-text-muted transition-colors hover:app-text app-hover-surface"
            aria-label={t('account_modal.close', { defaultValue: 'Close' })}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium app-text">
              {t('account_modal.username', { defaultValue: 'Username' })}
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
              disabled={isSaving}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium app-text">
              {t('account_modal.email', { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
              disabled={isSaving}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium app-text">
              {t('account_modal.current_password', { defaultValue: 'Current password' })}
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
              disabled={isSaving}
            />
            <p className="text-xs app-text-soft">
              {t('account_modal.password_hint', { defaultValue: 'Required to change your email or password.' })}
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium app-text">
                {t('account_modal.new_password', { defaultValue: 'New password' })}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
                disabled={isSaving}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium app-text">
                {t('account_modal.confirm_password', { defaultValue: 'Confirm new password' })}
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border app-input px-3 py-2 text-sm outline-none focus:border-teal-500"
                disabled={isSaving}
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-teal-600">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              {t('account_modal.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving
                ? t('account_modal.saving', { defaultValue: 'Saving...' })
                : t('account_modal.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}