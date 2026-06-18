'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const profileHref = user ? `/profile/${encodeURIComponent(user.username)}` : '/';

  const navItems = [
    { key: 'home', icon: '🏠', href: '/' },
    { key: 'explore', icon: '🔍', href: '#' },
    { key: 'notifications', icon: '🔔', href: '#' },
    { key: 'messages', icon: '✉️', href: '#' },
    { key: 'profile', icon: '👤', href: profileHref },
    { key: 'more', icon: '⋯', href: '#' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-62.5 h-screen sticky top-0 px-2 lg:px-6 py-4 border-r border-gray-200">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 p-3 hover:bg-gray-100 rounded-full w-max">
        <span className="font-black text-2xl text-teal-700 tracking-tighter hidden lg:block">Breezy</span>
        <span className="font-black text-2xl text-teal-700 block lg:hidden">C</span>
      </Link>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-4 text-xl p-3 hover:bg-gray-100 rounded-full transition-colors w-max lg:w-full">
            <span>{item.icon}</span>
            <span className="hidden lg:block font-semibold">{t(`sidebar.nav.${item.key}`)}</span>
          </Link>
        ))}
      </nav>

      {/* Primary Action Button */}
      <Button className="mt-6" variant="primary" size="lg">
        <span className="hidden lg:block">{t('sidebar.post_button')}</span>
        <span className="block lg:hidden">+</span>
      </Button>

      {/* User section at bottom */}
      <div className="mt-auto flex flex-col gap-1">
        <Link href={profileHref} className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-full cursor-pointer w-max lg:w-full transition-colors">
          <Avatar src={`https://i.pravatar.cc/150?u=${user?.id ?? 'anon'}`} alt="Avatar" size="md" />
          <div className="hidden lg:block overflow-hidden">
            <p className="font-bold text-sm truncate">{user?.username ?? '...'}</p>
            <p className="text-gray-500 text-sm truncate">@{user?.username?.toLowerCase() ?? ''}</p>
          </div>
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-4 p-3 rounded-full transition-colors text-gray-500 hover:bg-red-50 hover:text-red-500 w-max lg:w-full"
        >
          <span className="text-xl">🚪</span>
          <span className="hidden lg:block font-semibold text-sm">{t('sidebar.logout_button')}</span>
        </button>
      </div>
    </aside>
  );
}
