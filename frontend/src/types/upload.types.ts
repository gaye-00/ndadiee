/** Un fichier envoyé (UploadResponse.java). */
export interface UploadResult {
  /** Adresse publique, à écrire telle quelle dans le Markdown */
  url: string;
  contentType: string;
  /** Taille en octets */
  size: number;
}
