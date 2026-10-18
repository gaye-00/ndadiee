import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { UploadResult } from '@/types/upload.types';

const BASE = '/v1/uploads';

// Une image sur une connexion lente : bien plus que les 15 s d'une requête ordinaire
const UPLOAD_TIMEOUT = 120_000;

export const uploadService = {
  /**
   * Envoie une image du forum (JPEG, PNG, WebP ou GIF, 5 Mo au plus).
   *
   * @param onProgress avancement, de 0 à 1
   */
  image: (file: Blob, name: string, onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    form.append('file', file, name);
    return api
      .post<ApiResponse<UploadResult>>(`${BASE}/images`, form, {
        // Sans cela, l'en-tête JSON de l'instance ferait envoyer le formulaire en JSON ; le navigateur ajoute la frontière
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT,
        onUploadProgress: (event) => event.total && onProgress?.(event.loaded / event.total),
      })
      .then((r) => r.data.data);
  },
};
