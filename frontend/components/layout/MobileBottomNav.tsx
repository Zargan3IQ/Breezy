'use client';

import Link from 'next/link';
import { Home, Search, Bell, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PublishPostModal from '../feed/PublishPostModal';
import { useAuth } from '@/context/AuthContext';

export default function MobileBottomNav() {
  const { t } = useTranslation('common');
  const { logout } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 app-surface border-t app-border py-3 px-4 z-50 md:hidden">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <Link href="/" className="app-text-muted hover:text-brand transition-colors p-2">
          <Home size={24} />
        </Link>
        <Link href="/explore" className="app-text-muted hover:text-brand transition-colors p-2">
          <Search size={24} />
        </Link>

        <PublishPostModal triggerVariant="mobile" />

        <Link href="/notifications" className="app-text-muted hover:text-brand transition-colors p-2">
          <Bell size={24} />
        </Link>

        <Link href="/preferences" className="app-text-muted hover:text-brand transition-colors p-2" aria-label={t('sidebar.nav.preferences')}>
          <Settings size={24} />
        </Link>

        <button onClick={logout} className="app-text-muted hover:text-red-500 transition-colors p-2" aria-label={t('sidebar.logout_button')}>
          <LogOut size={24} />
        </button>
      </div>
    </nav>
  );
}
