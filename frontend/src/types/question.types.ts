import type { PaginationParams } from './common.types';
import type { Comment } from './interaction.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type QuestionStatus = 'OPEN' | 'CLOSED';

/** Période du classement « Top » du forum (QuestionPeriod.java) */
export type QuestionPeriod = 'WEEK' | 'MONTH' | 'YEAR';

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
  /** Temps de lecture estimé, en minutes (1 au moins) */
  readingMinutes: number;
  /** Le membre connecté l'a-t-il enregistré ? null pour un visiteur */
  bookmarkedByMe: boolean | null;
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
  readingMinutes: number;
  /** Vote du membre connecté : +1, -1, ou null s'il n'a pas voté */
  currentUserVote: number | null;
  /** Le membre connecté l'a-t-il enregistré ? null pour un visiteur */
  bookmarkedByMe: boolean | null;
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
  /** Avec (true) ou sans (false) réponse acceptée */
  solved?: boolean;
  /** Publiés depuis une semaine, un mois, un an (classement « Top ») */
  period?: QuestionPeriod;
  /** Le fil du membre connecté : les auteurs et les tags qu'il suit */
  following?: boolean;
}

/** Le forum en chiffres, et ses tags les plus utilisés (ForumOverviewResponse.java). */
export interface ForumOverview {
  topics: number;
  solved: number;
  unanswered: number;
  answers: number;
  /** Membres qui ont publié au moins un sujet ou une réponse */
  contributors: number;
  /** Les tags qui reviennent le plus dans les sujets */
  tags: ForumTagCount[];
}

export interface ForumTagCount {
  slug: string;
  name: string;
  topics: number;
}

/** Sujet enregistré ou retiré de la liste de lecture (BookmarkResponse.java). */
export interface BookmarkResponse {
  questionId: number;
  bookmarked: boolean;
  /** Sujets dans la liste de lecture du membre */
  savedCount: number;
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
  /** Le fil de commentaires de la réponse, du plus ancien au plus récent (seulement dans la liste des réponses) */
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerRequest {
  body: string;
}
