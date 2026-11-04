import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CropSource } from './ImageCropDialog';
import { useProjectImageUpload } from '@/hooks/useProjectImageUpload';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/imageUpload';
import { openImage, type CropArea, type ProjectImageFiles } from '@/lib/projectImages';

/** Le fichier d'origine d'une image du formulaire, et son cadrage : de quoi la recadrer sans la choisir de nouveau */
export interface LocalOriginal {
  file: File;
  crop: CropArea;
}

/** Les fichiers d'image d'un dépôt, d'un collage ou d'un sélecteur, dans les formats acceptés */
export const imageFilesOf = (files: FileList | null | undefined) =>
  Array.from(files ?? []).filter((file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type));

/**
 * Ce que le formulaire garde des images choisies pendant la visite, en mémoire seulement :
 * - le fichier d'origine de chacune et son cadrage, pour la recadrer (le fichier n'est décodé qu'à ce moment-là : une
 *   photo de 12 Mpx décodée pèse 48 Mo) ;
 * - l'aperçu de l'image préparée, montré pendant l'envoi puis à la place de l'image envoyée (c'est la même), pour
 *   qu'elle ne clignote pas en changeant d'adresse.
 *
 * Un brouillon retrouvé après un rechargement n'a que les adresses envoyées : on peut remplacer ses images, pas les
 * recadrer. Les aperçus sont libérés quand le formulaire disparaît.
 */
export function useLocalImages() {
  const originals = useRef(new Map<string, LocalOriginal>());
  const previews = useRef(new Map<string, string>());
  // Les aperçus se lisent au rendu : chaque changement en demande un nouveau
  const [, setVersion] = useState(0);

  useEffect(() => {
    const owned = previews.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);

  const keepOriginal = useCallback((key: string, original: LocalOriginal) => {
    originals.current.set(key, original);
  }, []);

  const dropOriginal = useCallback((key: string) => {
    originals.current.delete(key);
  }, []);

  const originalOf = useCallback((key: string) => originals.current.get(key), []);

  /** L'aperçu local d'une image envoyée, sous son adresse publique : il appartient désormais au formulaire */
  const keepPreview = useCallback((url: string, preview: string) => {
    previews.current.set(url, preview);
    setVersion((version) => version + 1);
  }, []);

  const previewOf = useCallback((url: string | null | undefined) => (url ? previews.current.get(url) : undefined), []);

  return { keepOriginal, dropOriginal, originalOf, keepPreview, previewOf };
}

export type LocalImages = ReturnType<typeof useLocalImages>;

function release(source: CropSource) {
  URL.revokeObjectURL(source.url);
  source.bitmap.close();
}

/** Ce que le cadreur rend : l'image préparée (grande et miniature), le fichier d'origine et le cadrage choisi */
export interface CroppedImage {
  files: ProjectImageFiles;
  original: LocalOriginal;
}

/**
 * Une séance de cadrage : décode le fichier, ouvre le cadreur, prépare l'image cadrée, puis libère l'image décodée.
 * Les props du cadreur sont à passer telles quelles à ImageCropDialog.
 *
 * @param onCropped l'image est prête à partir
 * @param onError   le fichier n'a pas pu être décodé ou préparé : le message à afficher
 */
export function useCropSession(onCropped: (image: CroppedImage, key: string) => void, onError: (message: string) => void) {
  const { t } = useTranslation('projectForm');
  const { prepare } = useProjectImageUpload();
  const [session, setSession] = useState<{ source: CropSource; file: File; crop: CropArea | null; key: string } | null>(null);
  const [open, setOpen] = useState(false);
  const current = useRef(session);
  useLayoutEffect(() => {
    current.current = session;
  });

  useEffect(
    () => () => {
      if (current.current) {
        release(current.current.source);
      }
    },
    [],
  );

  /** Ouvre le cadreur sur un fichier, avec le cadrage d'avant pour un recadrage ; `key` désigne l'image cadrée */
  const start = useCallback(
    async (file: File, key: string, crop: CropArea | null = null) => {
      try {
        const bitmap = await openImage(file);
        if (current.current) {
          release(current.current.source);
        }
        setSession({ source: { bitmap, url: URL.createObjectURL(file), name: file.name, width: bitmap.width, height: bitmap.height }, file, crop, key });
        setOpen(true);
      } catch {
        onError(t('images.errorType', { name: file.name }));
      }
    },
    [onError, t],
  );

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Fermé sans valider : l'image décodée n'est plus utile (le cadreur garde ses dimensions, le temps de disparaître)
    if (!next && session) {
      release(session.source);
    }
  }

  async function onConfirm(crop: CropArea) {
    if (!session) {
      return;
    }
    setOpen(false);
    try {
      const files = await prepare(session.source.bitmap, crop, session.file.name);
      onCropped({ files, original: { file: session.file, crop } }, session.key);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      release(session.source);
    }
  }

  return { start, dialog: { source: session?.source ?? null, initialCrop: session?.crop ?? null, open, onOpenChange, onConfirm } };
}
