import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguage, LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { storage } from '@/utils/storage';

/** Langue de l'interface, et changement de langue (mémorisé pour les prochaines visites). */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage ?? i18n.language);

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      storage.setLanguage(code);
      // Traductions téléchargées d'abord : changer de langue avant suspendrait toute la page le temps du chargement
      await i18n.loadLanguages(code);
      await i18n.changeLanguage(code);
    },
    [i18n],
  );

  return { language, languages: LANGUAGES, setLanguage };
}
