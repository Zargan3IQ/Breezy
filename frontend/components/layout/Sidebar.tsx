'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Home, Search, Bell, Mail, User, MoreHorizontal, LogOut, Wind, Shield, Settings } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PublishPostModal from '../feed/PublishPostModal';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { key: 'home',          icon: Home,          href: '/' },
  { key: 'explore',       icon: Search,        href: '/explore' },
  { key: 'notifications', icon: Bell,          href: '#' },
  { key: 'messages',      icon: Mail,          href: '#' },
  { key: 'profile',       icon: User,          href: '#' },
  { key: 'preferences',   icon: Settings,      href: '/preferences' },
  { key: 'more',          icon: MoreHorizontal,href: '#' },
];

export default function Sidebar() {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const profileHref = user ? `/profile/${encodeURIComponent(user.username)}` : '/';
  const isStaff = user?.role === 'admin' || user?.role === 'moderator';
  const navItems = isStaff
    ? [...NAV_ITEMS, { key: 'staff', icon: Shield, href: '/staff' }]
    : NAV_ITEMS;

  return (
    <aside className="hidden md:flex flex-col shrink-0 w-20 lg:w-64 xl:w-72 h-screen sticky top-0 px-2 lg:px-6 py-4 border-r app-border app-surface">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 mb-8 p-3 app-hover-surface rounded-full w-max transition-colors">
        <Wind size={28} className="text-brand shrink-0" />
        <span className="font-black text-2xl text-brand tracking-tighter hidden lg:block">Breezy</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ key, icon: Icon, href }) => (
          <Link key={key} href={key === 'profile' ? profileHref : href} className="nav-link">
            <Icon size={22} className="shrink-0" />
            <span className="hidden lg:block font-semibold">{t(`sidebar.nav.${key}`)}</span>
          </Link>
        ))}
      </nav>

      {/* Post button */}
      <PublishPostModal triggerVariant="sidebar" />

      {/* User + logout */}
      <div className="mt-auto flex flex-col gap-1">
        <Link href={profileHref} className="flex items-center gap-3 p-3 app-hover-surface rounded-full cursor-pointer w-max lg:w-full transition-colors">
          <Avatar src={user?.avatarUrl} alt="Avatar" size="md" />
          <div className="hidden lg:block overflow-hidden">
            <p className="font-bold text-sm truncate">{user?.username ?? '...'}</p>
            <p className="app-text-muted text-sm truncate">@{user?.username?.toLowerCase() ?? ''}</p>
          </div>
        </Link>

        <button
          onClick={logout}
          className="nav-link hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={22} className="shrink-0" />
          <span className="hidden lg:block font-semibold text-sm">{t('sidebar.logout_button')}</span>
        </button>
      </div>
    </aside>
  );
}
