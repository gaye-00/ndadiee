import type { Language, PaginationParams } from './common.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  readingTimeMinutes: number;
  author: UserSummary;
  tags: Tag[];
  language: Language;
  status: ArticleStatus;
  score: number;
  viewCount: number;
  /** null tant que l'article est un brouillon */
  publishedAt: string | null;
  createdAt: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  /** Markdown */
  content: string;
  coverImageUrl: string | null;
  readingTimeMinutes: number;
  author: UserSummary;
  tags: Tag[];
  language: Language;
  status: ArticleStatus;
  score: number;
  viewCount: number;
  publishedAt: string | null;
  currentUserVote: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRequest {
  title: string;
  content: string;
  coverImageUrl?: string;
  tags?: string[];
  language?: Language;
  /** true = publié ; false ou absent = brouillon */
  publish?: boolean;
}

export interface ArticleFilters extends PaginationParams {
  q?: string;
  tag?: string;
  language?: Language;
  author?: string;
}
