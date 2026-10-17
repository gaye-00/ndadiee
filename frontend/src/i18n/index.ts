import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, getLanguage, LANGUAGES, type LanguageConfig } from './languages';
import frCommon from './locales/fr/common.json';

// Un fichier par langue et par espace de noms (common, puis un par fonctionnalité si besoin),
// téléchargé seulement quand on en a besoin. Le français, langue par défaut et de secours,
// est déjà dans le bundle : pas d'attente au premier affichage.
const locales = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*/*.json',
  '!./locales/fr/common.json',
]);

// Langue et sens d'écriture sur <html> ; police de l'écriture (arabe, éthiopien) chargée à la demande
i18n.on('languageChanged', (code) => {
  const language = getLanguage(code);
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.dir;
  void language.font?.();
});

void i18n
  .use(
    resourcesToBackend((language: string, namespace: string) => {
      const load = locales[`./locales/${language}/${namespace}.json`];
      return load ? load() : Promise.reject(new Error(`Traductions introuvables : ${language}/${namespace}`));
    }),
  )
  .use(initReactI18next)
  .init({
    // Choisie avant le premier rendu par le script de index.html : choix enregistré, sinon langue du navigateur
    lng: getLanguage(document.documentElement.lang).code,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES.map((language) => language.code),
    load: 'languageOnly',
    ns: ['common'],
    defaultNS: 'common',
    resources: { fr: { common: frCommon } },
    partialBundledLanguages: true,
    // React échappe déjà le texte affiché
    interpolation: { escapeValue: false },
  });

/** Langue de l'interface, avec ses réglages (sens d'écriture, locales Intl…). */
export function currentLanguage(): LanguageConfig {
  return getLanguage(i18n.resolvedLanguage ?? i18n.language);
}

export default i18n;
