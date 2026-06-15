'use client';

import { useTranslation } from 'react-i18next';

export default function RightSidebar() {
  const { t } = useTranslation('common');
  return (
    <aside className="hidden lg:block w-87.5 pl-8 py-4 sticky top-0 h-screen overflow-y-auto">
      {/* Search Bar */}
      <div className="bg-gray-100 rounded-full flex items-center px-4 py-2 mb-6">
        <span className="text-gray-500 mr-2">🔍</span>
        <input 
          type="text" 
          placeholder={t('right_sidebar.search_placeholder')}
          className="bg-transparent border-none outline-none w-full text-sm"
        />
      </div>

      {/* Who to follow card */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 mb-6">
        <h2 className="font-bold text-lg mb-4">{t('right_sidebar.who_to_follow.title')}</h2>
        {/* We will map over user data here later */}
        <p className="text-sm text-gray-500">{t('right_sidebar.who_to_follow.empty_message')}</p>
      </div>

      {/* Trending Topics card */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <h2 className="font-bold text-lg mb-4">{t('right_sidebar.trending.title')}</h2>
        <ul className="text-teal-600 text-sm space-y-2">
          <li>#UrbanArt</li>
          <li>#ColorWave</li>
          <li>#DesignInspo</li>
        </ul>
      </div>
    </aside>
  );
}