import { ACCEPTED_IMAGE_TYPES, ImagePreparationError, MAX_IMAGE_BYTES } from './imageUpload';

/**
 * Les images d'un projet (couverture et captures), préparées dans le navigateur avant l'envoi : recadrées au format
 * de la page du projet (16:10, design 3D), réduites à 1280 px de large avec une miniature de 640 px, réencodées en
 * WebP. Le réencodage retire les métadonnées de la photo (position GPS, appareil) ; une photo de téléphone de 4 Mo
 * part à environ 200 Ko, sa miniature à 40 Ko.
 */

/** Format de la galerie et des cartes de la vitrine */
export const PROJECT_IMAGE_ASPECT = 16 / 10;
/** Largeur de la grande image, et de sa miniature */
export const FULL_WIDTH = 1280;
export const THUMBNAIL_WIDTH = 640;
/** En deçà, la grande image sera agrandie à l'écran : elle risque d'être floue */
export const SHARP_WIDTH = 960;

const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
// Fond d'une image transparente réencodée en JPEG (navigateur sans WebP) : le papier du thème clair
const OPAQUE_BACKGROUND = '#f5f5f2';

/** Une zone de l'image d'origine, en pixels */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Une image prête à partir : la grande, sa miniature, et les dimensions de la grande */
export interface ProjectImageFiles {
  full: Blob;
  thumbnail: Blob;
  name: string;
  width: number;
  height: number;
}

/** Ouvre une image choisie par le membre, orientée comme elle a été prise (EXIF), ou refuse son format. */
export async function openImage(file: File): Promise<ImageBitmap> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImagePreparationError('type');
  }
  return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new ImagePreparationError('type');
  });
}

/** La plus grande zone au format voulu, au centre de l'image : le recadrage proposé d'office */
export function centeredCrop(width: number, height: number, aspect = PROJECT_IMAGE_ASPECT): CropArea {
  const cropWidth = Math.min(width, height * aspect);
  const cropHeight = cropWidth / aspect;
  return { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImagePreparationError('type');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

/**
 * Dessine une zone de l'image à la taille voulue. Une forte réduction se fait par moitiés successives : en une seule
 * passe, le navigateur ne lit qu'une partie des pixels, et les traits fins (texte d'une capture) scintillent.
 */
function draw(source: CanvasImageSource, area: CropArea, width: number, height: number): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let region = area;
  while (region.width / 2 >= width) {
    const step = canvasOf(Math.round(region.width / 2), Math.round(region.height / 2));
    step.context.drawImage(current, region.x, region.y, region.width, region.height, 0, 0, step.canvas.width, step.canvas.height);
    current = step.canvas;
    region = { x: 0, y: 0, width: step.canvas.width, height: step.canvas.height };
  }
  const target = canvasOf(width, height);
  target.context.drawImage(current, region.x, region.y, region.width, region.height, 0, 0, width, height);
  return target.canvas;
}

// WebP, sinon JPEG (Safari ne sait pas toujours écrire le WebP) sur un fond opaque
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (webp && webp.type === 'image/webp') {
    return webp;
  }
  const opaque = canvasOf(canvas.width, canvas.height);
  opaque.context.fillStyle = OPAQUE_BACKGROUND;
  opaque.context.fillRect(0, 0, canvas.width, canvas.height);
  opaque.context.drawImage(canvas, 0, 0);
  const jpeg = await toBlob(opaque.canvas, 'image/jpeg', JPEG_QUALITY);
  if (!jpeg) {
    throw new ImagePreparationError('type');
  }
  return jpeg;
}

/**
 * La zone choisie, prête à partir : la grande image (1280 px de large au plus, jamais agrandie) et sa miniature
 * (640 px). Le nom reprend celui du fichier d'origine.
 */
export async function renderProjectImage(source: ImageBitmap, crop: CropArea, fileName: string): Promise<ProjectImageFiles> {
  const width = Math.max(1, Math.round(Math.min(FULL_WIDTH, crop.width)));
  const height = Math.max(1, Math.round(width * (crop.height / crop.width)));
  const fullCanvas = draw(source, crop, width, height);
  const thumbnailWidth = Math.min(THUMBNAIL_WIDTH, width);
  const thumbnailCanvas = draw(fullCanvas, { x: 0, y: 0, width, height }, thumbnailWidth, Math.round(thumbnailWidth * (height / width)));

  const [full, thumbnail] = await Promise.all([encode(fullCanvas), encode(thumbnailCanvas)]);
  if (full.size > MAX_IMAGE_BYTES || thumbnail.size > MAX_IMAGE_BYTES) {
    throw new ImagePreparationError('size');
  }
  const extension = full.type === 'image/webp' ? 'webp' : 'jpg';
  return { full, thumbnail, width, height, name: `${fileName.replace(/\.[^.]+$/, '') || 'image'}.${extension}` };
}
