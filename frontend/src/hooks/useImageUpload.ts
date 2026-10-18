import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePreparationError, MAX_IMAGE_BYTES, prepareImage } from '@/lib/imageUpload';
import { uploadService } from '@/services/upload.service';
import { getApiErrorMessage } from '@/utils/apiError';

/**
 * Envoyer les images d'un contenu du forum (lib/imageUpload.ts, puis l'API). Le formulaire qui s'en sert sait
 * combien d'envois sont en cours (`pending`) : il attend leur fin avant de publier.
 *
 * @returns `upload(file)`, qui rend l'adresse publique de l'image ou rejette avec un message à afficher
 */
export function useImageUpload() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(0);

  const upload = useCallback(
    async (file: File): Promise<string> => {
      setPending((count) => count + 1);
      try {
        const prepared = await prepareImage(file);
        const result = await uploadService.image(prepared.blob, prepared.name);
        return result.url;
      } catch (error) {
        if (error instanceof ImagePreparationError) {
          throw new Error(
            error.reason === 'size'
              ? t('editor.imageTooBig', { name: file.name, max: MAX_IMAGE_BYTES / (1024 * 1024) })
              : t('editor.imageType', { name: file.name }),
          );
        }
        throw new Error(getApiErrorMessage(error, t('editor.uploadFailed', { name: file.name })));
      } finally {
        setPending((count) => count - 1);
      }
    },
    [t],
  );

  return { upload, pending };
}
