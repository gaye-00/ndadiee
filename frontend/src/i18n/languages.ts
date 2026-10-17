/**
 * Langues de l'interface.
 *
 * Ajouter une langue :
 * 1. copier locales/fr/ dans locales/<code>/ et traduire les valeurs ;
 * 2. l'ajouter ci-dessous ;
 * 3. ajouter son code à la liste du script de index.html (langue posée avant le premier rendu) ;
 * 4. vérifier avec `npm run i18n:check`.
 */

export interface LanguageConfig {
  /** Code BCP 47, aussi nom du dossier dans locales/ */
  code: string;
  /** Nom de la langue dans la langue elle-même, affiché dans le sélecteur */
  name: string;
  /** Nom en anglais, pour la recherche dans le sélecteur */
  englishName: string;
  dir: 'ltr' | 'rtl';
  /**
   * Locales des formats de date et de nombre (Intl), par ordre de préférence : le navigateur prend
   * la première qu'il connaît. Utile pour les langues que tous les navigateurs ne savent pas encore formater.
   */
  intl: readonly string[];
  /** Police de l'écriture, téléchargée seulement quand la langue est choisie */
  font?: () => Promise<unknown>;
}

export const LANGUAGES = [
  // Langues officielles les plus parlées du continent
  { code: 'fr', name: 'Français', englishName: 'French', dir: 'ltr', intl: ['fr'] },
  { code: 'en', name: 'English', englishName: 'English', dir: 'ltr', intl: ['en-GB', 'en'] },
  {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    dir: 'rtl',
    // Chiffres latins (0-9), comme au Maghreb : plus lisibles à côté du code
    intl: ['ar-u-nu-latn', 'ar'],
    font: () => import('@fontsource-variable/noto-sans-arabic'),
  },
  { code: 'pt', name: 'Português', englishName: 'Portuguese', dir: 'ltr', intl: ['pt-AO', 'pt-PT', 'pt'] },

  // Langues africaines
  {
    code: 'am',
    name: 'አማርኛ',
    englishName: 'Amharic',
    dir: 'ltr',
    intl: ['am-ET', 'am', 'en-GB'],
    font: () => import('@fontsource-variable/noto-sans-ethiopic'),
  },
  { code: 'ha', name: 'Hausa', englishName: 'Hausa', dir: 'ltr', intl: ['ha-NG', 'ha', 'en-NG', 'en-GB'] },
  { code: 'sw', name: 'Kiswahili', englishName: 'Swahili', dir: 'ltr', intl: ['sw-KE', 'sw', 'en-GB'] },
  { code: 'wo', name: 'Wolof', englishName: 'Wolof', dir: 'ltr', intl: ['wo-SN', 'wo', 'fr-SN', 'fr'] },
  { code: 'yo', name: 'Yorùbá', englishName: 'Yoruba', dir: 'ltr', intl: ['yo-NG', 'yo', 'en-NG', 'en-GB'] },
  { code: 'zu', name: 'isiZulu', englishName: 'Zulu', dir: 'ltr', intl: ['zu-ZA', 'zu', 'en-ZA', 'en-GB'] },
] as const satisfies readonly LanguageConfig[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Langue par défaut, et de secours pour un texte pas encore traduit */
export const DEFAULT_LANGUAGE: LanguageCode = 'fr';

/** Réglages d'une langue ; la langue par défaut si le code n'est pas pris en charge. */
export function getLanguage(code: string | null | undefined): LanguageConfig {
  return (
    LANGUAGES.find((language) => language.code === code) ??
    LANGUAGES.find((language) => language.code === DEFAULT_LANGUAGE)!
  );
}
