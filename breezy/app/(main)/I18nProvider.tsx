"use client";

import React, { useEffect, useState } from 'react';
import i18n from './i18n'; 
import { I18nextProvider } from 'react-i18next';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Ce useEffect s'exécute uniquement une fois sur le navigateur client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Tant que nous sommes sur le serveur, on renvoie "null" 
  // (Rien n'est généré sur le serveur, donc aucune clé brute ne peut entrer en conflit)
  if (!mounted) {
    return null; 
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}