import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Charge les fichiers JSON depuis le dossier public/locales
  .use(Backend)
  // Détecte automatiquement la langue du navigateur
  .use(LanguageDetector)
  // Connecte i18next à React
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', // Langue par défaut si la langue du navigateur n'est pas dispo
    load: 'languageOnly',
    debug: true,       // Pratique en développement pour voir ce qui se passe dans la console
    
    ns: ['common', 'auth', 'profile', 'staff'],          
    defaultNS: 'common',
    
    backend: {
      // Chemin d'accès à vos fichiers JSON
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false, // React gère déjà la protection XSS
    },
  });

export default i18n;  