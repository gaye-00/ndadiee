/** Les formats d'image que le forum accepte (ImageUploadService.java) */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

/** Taille maximale d'une image, une fois préparée (ndadiee.storage.max-image-size) */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Côté le plus long d'une image envoyée : assez pour un écran large, bien moins lourd qu'une photo de téléphone
const MAX_SIDE = 1920;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

/** Pourquoi une image ne peut pas partir : son format, ou son poids */
export class ImagePreparationError extends Error {
  readonly reason: 'type' | 'size';

  constructor(reason: 'type' | 'size') {
    super(reason);
    this.reason = reason;
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Prépare une image avant l'envoi, dans le navigateur : réduite à 1920 px de côté, réencodée en WebP (en JPEG, ou en
 * PNG pour garder la transparence, si le navigateur ne sait pas écrire le WebP). Le réencodage retire aussi les
 * métadonnées de la photo (sa position GPS, l'appareil), et une photo de 4 Mo descend souvent sous 300 Ko : moins de
 * données pour celui qui l'envoie, et pour tous ceux qui la liront. Un GIF part tel quel, pour garder son animation.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImagePreparationError('type');
  }
  if (file.type === 'image/gif') {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ImagePreparationError('size');
    }
    return { blob: file, name: file.name };
  }

  // L'orientation de la photo (EXIF) est appliquée avant que les métadonnées ne disparaissent
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new ImagePreparationError('type');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  // Safari ne sait pas toujours écrire le WebP : il rend du PNG à la place
  if (!blob || blob.type !== 'image/webp') {
    blob = file.type === 'image/png' ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  }
  if (!blob) {
    throw new ImagePreparationError('type');
  }
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new ImagePreparationError('size');
  }
  const extension = blob.type.split('/')[1] === 'jpeg' ? 'jpg' : blob.type.split('/')[1];
  return { blob, name: `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}` };
}
