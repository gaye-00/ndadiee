import type { PaginationParams } from './common.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type QuestionStatus = 'OPEN' | 'CLOSED';

/** Question dans une liste : extrait à la place du contenu complet. */
export interface QuestionSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author: UserSummary;
  tags: Tag[];
  viewCount: number;
  score: number;
  answerCount: number;
  hasAcceptedAnswer: boolean;
  status: QuestionStatus;
  createdAt: string;
}

export interface Question {
  id: number;
  title: string;
  slug: string;
  /** Markdown */
  body: string;
  author: UserSummary;
  tags: Tag[];
  viewCount: number;
  score: number;
  answerCount: number;
  acceptedAnswerId: number | null;
  status: QuestionStatus;
  /** Vote du membre connecté : +1, -1, ou null s'il n'a pas voté */
  currentUserVote: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRequest {
  title: string;
  body: string;
  /** Noms de tags, 1 à 5 */
  tags: string[];
}

export interface QuestionFilters extends PaginationParams {
  q?: string;
  /** Slug de tag */
  tag?: string;
  status?: QuestionStatus;
  /** Nom d'utilisateur */
  author?: string;
  unanswered?: boolean;
}

export interface Answer {
  id: number;
  /** Markdown */
  body: string;
  questionId: number;
  author: UserSummary;
  score: number;
  accepted: boolean;
  currentUserVote: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerRequest {
  body: string;
}
