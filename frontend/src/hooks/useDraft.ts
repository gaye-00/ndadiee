import { useEffect, useRef, useState } from 'react';
import { storage } from '@/utils/storage';

// Le brouillon s'enregistre à la pause dans la frappe, pas à chaque touche
const SAVE_DELAY = 500;

/**
 * Un brouillon gardé sur l'appareil (nouveau sujet, réponse en cours) : il survit à un rechargement, à une coupure
 * réseau, à un onglet fermé par erreur. Vide, il est effacé.
 *
 * @param key  identifiant du brouillon (« topic », « answer-12 ») ; null : pas de brouillon (modification)
 * @returns la valeur, de quoi la changer, de quoi effacer le brouillon, si elle vient d'un brouillon retrouvé, et
 *   la date du dernier enregistrement
 */
export function useDraft<T>(key: string | null, initial: T, isEmpty: (value: T) => boolean) {
  const [restored] = useState(() => (key ? storage.getDraft<T>(key) : null));
  const [value, setValue] = useState<T>(restored ?? initial);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const emptyCheck = useRef(isEmpty);

  useEffect(() => {
    if (!key) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (emptyCheck.current(value)) {
        storage.clearDraft(key);
        setSavedAt(null);
      } else {
        storage.setDraft(key, value);
        setSavedAt(new Date());
      }
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [key, value]);

  const clear = () => {
    if (key) {
      storage.clearDraft(key);
    }
    setSavedAt(null);
  };

  return { value, setValue, clear, restored: restored !== null, savedAt };
}
