import type { ContentType } from './common.types';
import type { UserSummary } from './user.types';

export interface Comment {
  id: number;
  body: string;
  author: UserSummary;
  targetType: ContentType;
  targetId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRequest {
  targetType: ContentType;
  targetId: number;
  body: string;
}

export interface VoteRequest {
  targetType: ContentType;
  targetId: number;
  /** +1 ou -1 (un projet n'accepte que +1 : c'est une étoile) */
  value: 1 | -1;
}

export interface VoteResponse {
  targetType: ContentType;
  targetId: number;
  /** Vote du membre après l'opération : +1, -1, ou 0 s'il l'a retiré */
  value: number;
  /** Nouveau score du contenu (nombre d'étoiles pour un projet) */
  score: number;
}
