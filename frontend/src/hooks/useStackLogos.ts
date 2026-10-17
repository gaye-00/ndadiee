import { useEffect, useState } from 'react';
import type { StackLogoId } from '@/lib/stackLogos';
import { useDataSaverStore } from '@/store/useDataSaverStore';

type LogoPaths = Readonly<Record<StackLogoId, string>>;

// Téléchargés une seule fois pour toute la visite
let paths: LogoPaths | null = null;
let request: Promise<LogoPaths> | null = null;

/**
 * Tracés des logos des technologies (lib/stackLogos.ts). Ils sont dans un fichier à part : téléchargés
 * après la page, et jamais en mode économie de données, comme les autres images.
 *
 * @returns les tracés ; null pendant le téléchargement ; false sans logos (économie de données, échec)
 */
export function useStackLogos(): LogoPaths | null | false {
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const [loaded, setLoaded] = useState<LogoPaths | null | false>(paths);

  useEffect(() => {
    if (loaded !== null || dataSaver) {
      return;
    }
    let active = true;
    request ??= import('@/lib/stackLogos').then((module) => (paths = module.stackLogoPaths));
    request.then(
      (result) => {
        if (active) {
          setLoaded(result);
        }
      },
      () => {
        // Hors ligne : les noms suffisent ; une prochaine visite réessaiera
        request = null;
        if (active) {
          setLoaded(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [loaded, dataSaver]);

  return dataSaver ? false : loaded;
}
