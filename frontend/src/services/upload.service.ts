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
    return send(`${BASE}/images`, form, onProgress);
  },

  /**
   * Envoie une couverture ou une capture de projet (1280 px de côté au plus) avec sa miniature (640 px), préparées
   * dans le navigateur (lib/projectImages.ts). Une image qu'aucun projet ne montre est supprimée au bout d'une semaine.
   *
   * @param onProgress avancement, de 0 à 1
   */
  projectImage: (image: { full: Blob; thumbnail: Blob; name: string }, onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    form.append('file', image.full, image.name);
    form.append('thumbnail', image.thumbnail, image.name.replace(/(\.[^.]+)?$/, '-640$1'));
    return send(`${BASE}/project-images`, form, onProgress);
  },
};

function send(url: string, form: FormData, onProgress?: (fraction: number) => void) {
  return api
    .post<ApiResponse<UploadResult>>(url, form, {
      // Sans cela, l'en-tête JSON de l'instance ferait envoyer le formulaire en JSON ; le navigateur ajoute la frontière
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: (event) => event.total && onProgress?.(event.loaded / event.total),
    })
    .then((r) => r.data.data);
}
