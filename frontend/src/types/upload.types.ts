/** Un fichier envoyé (UploadResponse.java). */
export interface UploadResult {
  /** Adresse publique, à écrire telle quelle dans le Markdown */
  url: string;
  /** Image de projet : sa miniature (640 px) */
  thumbnailUrl?: string;
  contentType: string;
  /** Taille en octets */
  size: number;
}
