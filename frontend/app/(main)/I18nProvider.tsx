'use client';

import React, { useEffect, useState } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      return;
    }

    i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'fr',
        load: 'languageOnly',
        debug: process.env.NODE_ENV === 'development',
        ns: ['common', 'auth', 'profile', 'staff'],
        defaultNS: 'common',
        backend: {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        interpolation: {
          escapeValue: false,
        },
      })
      .then(() => setIsInitialized(true));
  }, []);

  if (!isInitialized) return null;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}