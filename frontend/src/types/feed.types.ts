import type { Language, PageResponse, PaginationParams } from './common.types';
import type { ArticleSummary } from './article.types';
import type { Project } from './project.types';
import type { QuestionSummary } from './question.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

/** Élément du fil d'actualité : question, article ou projet ramené à une forme commune. */
export interface FeedItem {
  type: 'QUESTION' | 'ARTICLE' | 'PROJECT';
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  author: UserSummary;
  tags: Tag[];
  /** Score des votes ; nombre d'étoiles pour un projet */
  score: number;
  // Selon le type : null quand le champ n'existe pas pour ce contenu
  coverImageUrl: string | null;
  viewCount: number | null;
  answerCount: number | null;
  language: Language | null;
  createdAt: string;
}

export interface FeedFilters {
  /** Slug de tag */
  tag?: string;
  /** Code ISO à 2 lettres */
  country?: string;
  language?: Language;
}

export type SearchType = 'ALL' | 'QUESTIONS' | 'ARTICLES' | 'PROJECTS' | 'USERS';

/** Seules les catégories demandées sont présentes. */
export interface SearchResponse {
  query: string;
  questions?: PageResponse<QuestionSummary>;
  articles?: PageResponse<ArticleSummary>;
  projects?: PageResponse<Project>;
  users?: PageResponse<UserSummary>;
}

export interface SearchParams extends PaginationParams {
  q: string;
  type?: SearchType;
}
