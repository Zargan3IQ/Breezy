'use client';

import { Languages, MonitorCog, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

const LANGUAGE_OPTIONS = [
  { code: 'fr', key: 'french' },
  { code: 'en', key: 'english' },
  { code: 'es', key: 'spanish' },
  { code: 'ar', key: 'arabic' },
  { code: 'he', key: 'hebrew' },
  { code: 'ru', key: 'russian' },
  { code: 'ty', key: 'tahitian' },
] as const;

const THEME_OPTIONS: Array<{ value: 'light' | 'dark'; icon: typeof Sun }> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export default function PreferencesPage() {
  const { t, i18n } = useTranslation('common');
  const { theme, setTheme } = useTheme();
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').split('-')[0];

  const handleLanguageChange = async (language: string) => {
    await i18n.changeLanguage(language);
    window.localStorage.setItem('i18nextLng', language);
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <MonitorCog size={24} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('preferences_page.title')}</h1>
            <p className="app-text-muted max-w-2xl text-sm sm:text-base">
              {t('preferences_page.description')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Languages size={20} />
            </div>
            <div>
              <h2 className="font-semibold">{t('preferences_page.language.title')}</h2>
              <p className="app-text-muted text-sm">{t('preferences_page.language.description')}</p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium" htmlFor="language-preference">
            {t('preferences_page.language.label')}
          </label>
          <select
            id="language-preference"
            value={currentLanguage}
            onChange={(event) => handleLanguageChange(event.target.value)}
            className="w-full rounded-2xl border app-border app-surface px-4 py-3 outline-none transition focus:border-brand"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.code} value={language.code}>
                {t(`preferences_page.language.options.${language.key}`)}
              </option>
            ))}
          </select>
        </section>

        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2 className="font-semibold">{t('preferences_page.theme.title')}</h2>
              <p className="app-text-muted text-sm">{t('preferences_page.theme.description')}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => {
              const isSelected = theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={isSelected}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'app-border app-surface app-hover-surface'
                  }`}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-black/5">
                    <Icon size={20} />
                  </div>
                  <p className="font-semibold">{t(`preferences_page.theme.options.${value}`)}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
