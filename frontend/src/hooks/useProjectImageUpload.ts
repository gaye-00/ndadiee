import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePreparationError, MAX_IMAGE_BYTES } from '@/lib/imageUpload';
import { renderProjectImage, type CropArea, type ProjectImageFiles } from '@/lib/projectImages';
import { uploadService } from '@/services/upload.service';
import { getApiErrorMessage } from '@/utils/apiError';

/** Une image de projet envoyée : ses adresses, ses dimensions, et un aperçu local qui s'affiche sans attendre */
export interface UploadedProjectImage {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

/**
 * Préparer puis envoyer les images d'un projet (lib/projectImages.ts, puis l'API). Les deux étapes sont séparées :
 * l'aperçu de l'image préparée s'affiche pendant l'envoi, et un envoi qui échoue (réseau coupé) se relance sans
 * refaire la préparation.
 *
 * Les erreurs sont rejetées avec un message à afficher, dans la langue de l'interface.
 */
export function useProjectImageUpload() {
  const { t } = useTranslation('projectForm');

  const prepare = useCallback(
    async (source: ImageBitmap, crop: CropArea, fileName: string): Promise<ProjectImageFiles> => {
      try {
        return await renderProjectImage(source, crop, fileName);
      } catch (error) {
        throw new Error(
          error instanceof ImagePreparationError && error.reason === 'size'
            ? t('images.errorSize', { max: MAX_IMAGE_BYTES / (1024 * 1024) })
            : t('images.errorType', { name: fileName }),
        );
      }
    },
    [t],
  );

  const upload = useCallback(
    async (files: ProjectImageFiles, onProgress?: (fraction: number) => void): Promise<UploadedProjectImage> => {
      try {
        const result = await uploadService.projectImage(files, onProgress);
        return { url: result.url, thumbnailUrl: result.thumbnailUrl ?? result.url, width: files.width, height: files.height };
      } catch (error) {
        throw new Error(getApiErrorMessage(error, t('images.errorUpload')));
      }
    },
    [t],
  );

  return { prepare, upload };
}

/** Le message d'une image refusée avant même d'être préparée (format) */
export function imageErrorMessage(error: unknown, fileName: string, t: (key: 'images.errorType', options: { name: string }) => string) {
  return error instanceof ImagePreparationError ? t('images.errorType', { name: fileName }) : error instanceof Error ? error.message : String(error);
}
