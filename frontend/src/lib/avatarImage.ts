import { ACCEPTED_IMAGE_TYPES, ImagePreparationError } from './imageUpload';

/** Côté de la photo envoyée, en pixels : nette sur le plus grand avatar (le profil) d'un écran à forte densité */
export const AVATAR_SIZE = 512;
/** Poids maximal d'une photo choisie : celle d'un téléphone pèse souvent 5 à 12 Mo, elle est réduite ici */
export const MAX_AVATAR_SOURCE_BYTES = 20 * 1024 * 1024;
/** Poids maximal de la photo préparée (AvatarService.java) */
const MAX_AVATAR_BYTES = 1024 * 1024;

const WEBP_QUALITY = 0.86;
const JPEG_QUALITY = 0.9;

/** Zoom du cadrage : à 1, le cercle touche les bords du petit côté de la photo */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Le cadrage d'une photo dans le cercle : le point de la photo au centre (en pixels de la photo), et le zoom */
export interface AvatarFrame {
  cx: number;
  cy: number;
  zoom: number;
}

/** Ce que l'on garde de la photo : un carré, en pixels de la photo */
export interface AvatarCrop {
  x: number;
  y: number;
  size: number;
}

/** Dimensions de la photo, une fois orientée */
interface Size {
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Côté du carré gardé, en pixels de la photo */
function cropSide(image: Size, zoom: number): number {
  return Math.min(image.width, image.height) / zoom;
}

/** Le cadrage de départ : la photo centrée, le cercle au plus large */
export function centeredFrame(image: Size): AvatarFrame {
  return { cx: image.width / 2, cy: image.height / 2, zoom: MIN_ZOOM };
}

/** Le cadrage ramené dans la photo : le carré gardé n'en sort jamais, le zoom reste entre ses bornes */
export function clampFrame(frame: AvatarFrame, image: Size): AvatarFrame {
  const zoom = clamp(frame.zoom, MIN_ZOOM, MAX_ZOOM);
  const half = cropSide(image, zoom) / 2;
  return { zoom, cx: clamp(frame.cx, half, image.width - half), cy: clamp(frame.cy, half, image.height - half) };
}

/** Pixels d'écran par pixel de la photo, pour un cercle de ce diamètre (en pixels d'écran) */
export function frameScale(frame: AvatarFrame, image: Size, stage: number): number {
  return stage / cropSide(image, frame.zoom);
}

/** La photo glissée de (dx, dy) pixels d'écran sous le cercle */
export function panFrame(frame: AvatarFrame, image: Size, stage: number, dx: number, dy: number): AvatarFrame {
  const scale = frameScale(frame, image, stage);
  return clampFrame({ ...frame, cx: frame.cx - dx / scale, cy: frame.cy - dy / scale }, image);
}

/**
 * Un autre zoom, autour d'un point du cercle (en pixels d'écran depuis son centre) : ce qui est sous le doigt ou la
 * souris y reste.
 */
export function zoomFrame(frame: AvatarFrame, image: Size, stage: number, zoom: number, around = { x: 0, y: 0 }): AvatarFrame {
  const before = frameScale(frame, image, stage);
  const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const after = frameScale({ ...frame, zoom: next }, image, stage);
  const pointX = frame.cx + around.x / before;
  const pointY = frame.cy + around.y / before;
  return clampFrame({ zoom: next, cx: pointX - around.x / after, cy: pointY - around.y / after }, image);
}

/** Le carré gardé, pour ce cadrage */
export function cropOf(frame: AvatarFrame, image: Size): AvatarCrop {
  const size = cropSide(image, frame.zoom);
  return { x: frame.cx - size / 2, y: frame.cy - size / 2, size };
}

/**
 * Ouvre une photo choisie : JPEG, PNG, WebP ou GIF (sa première image), 20 Mo au plus. L'orientation de la photo
 * (EXIF) est appliquée : ce qu'on recadre est ce qu'on voit.
 */
export async function openAvatarSource(file: File): Promise<ImageBitmap> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImagePreparationError('type');
  }
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new ImagePreparationError('size');
  }
  return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new ImagePreparationError('type');
  });
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * La photo de profil prête à partir : le carré gardé, réduit à 512 px de côté (moins si la photo est plus petite),
 * en WebP ; en JPEG sur fond blanc si le navigateur ne sait pas écrire le WebP (Safari). Le réencodage retire les
 * métadonnées de la photo (position GPS, appareil) : seule l'image part, et elle pèse quelques dizaines de Ko.
 */
export async function renderAvatar(source: ImageBitmap, crop: AvatarCrop): Promise<{ blob: Blob; name: string }> {
  const side = Math.max(1, Math.min(AVATAR_SIZE, Math.round(crop.size)));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImagePreparationError('type');
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, side, side);

  let blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (!blob || blob.type !== 'image/webp') {
    // Le JPEG n'a pas de transparence : sans fond, les zones transparentes deviendraient noires
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, side, side);
    blob = await toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  }
  if (!blob) {
    throw new ImagePreparationError('type');
  }
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new ImagePreparationError('size');
  }
  return { blob, name: blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg' };
}
