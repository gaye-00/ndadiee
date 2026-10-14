// Noms de champs alignés sur ceux du backend Java

/** Enveloppe de toutes les réponses réussies (ApiResponse.java). */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Page de résultats (PageResponse.java). `page` commence à 0. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  /** Format Spring : "champ,desc" (ex. "createdAt,desc", "score,desc") */
  sort?: string;
}

export type Language = 'FR' | 'EN';

/** Contenus qui peuvent recevoir des votes et des commentaires. */
export type ContentType = 'QUESTION' | 'ANSWER' | 'ARTICLE' | 'PROJECT';
