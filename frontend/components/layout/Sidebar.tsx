'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

export default function Sidebar() {
  const { t } = useTranslation('common');
  const navItems = [
    { key: 'home', icon: '🏠', href: '/' },
    { key: 'explore', icon: '🔍', href: '#' },
    { key: 'notifications', icon: '🔔', href: '#' },
    { key: 'messages', icon: '✉️', href: '#' },
    { key: 'profile', icon: '👤', href: '#' },
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

      {/* User Mini Profile at bottom (Placeholder) */}
      <div className="mt-auto flex items-center gap-3 p-3 hover:bg-gray-100 rounded-full cursor-pointer w-max lg:w-full transition-colors">
        <Avatar src="https://i.pravatar.cc/150?u=current" alt="Avatar" size="md" />
        <div className="hidden lg:block">
          <p className="font-bold text-sm">VibrantLife</p>
          <p className="text-gray-500 text-sm">@vibrantlife</p>
        </div>
      </div>
    </aside>
  );
}