import {
  Check,
  Clock,
  FileDiff,
  FileMinus2,
  FilePen,
  FilePlus2,
  FileSymlink,
  GitMerge,
  GitPullRequestArrow,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { PullRequest, PullRequestFileStatus, ReviewState } from '@/types/review.types';

/** La longueur maximale d'un commentaire, d'une suggestion ou d'un message de revue (ReviewCommentRequest.MAX_BODY) */
export const MAX_REVIEW_TEXT = 10_000;

/** L'état d'une PR : ouverte, brouillon, fusionnée, fermée */
export type Phase = 'open' | 'draft' | 'merged' | 'closed';

/** Le pictogramme et les couleurs de chaque état : pastille, et accent de la carte */
export const PHASES: Record<Phase, { icon: LucideIcon; tone: string; accent: string }> = {
  open: { icon: GitPullRequestArrow, tone: 'bg-jade/12 text-jade ring-jade/25', accent: 'var(--kente-jade)' },
  draft: { icon: GitPullRequestDraft, tone: 'bg-foreground/6 text-muted-foreground ring-foreground/10', accent: 'var(--faint-foreground)' },
  merged: { icon: GitMerge, tone: 'bg-gold/12 text-gold ring-gold/25', accent: 'var(--kente-gold)' },
  closed: { icon: GitPullRequestClosed, tone: 'bg-coral/10 text-coral ring-coral/25', accent: 'var(--kente-coral)' },
};

export function phaseOf(pullRequest: Pick<PullRequest, 'status' | 'draft'>): Phase {
  if (pullRequest.status === 'MERGED') {
    return 'merged';
  }
  if (pullRequest.status === 'CLOSED') {
    return 'closed';
  }
  return pullRequest.draft ? 'draft' : 'open';
}

/**
 * Le verdict d'une revue sur l'avatar de son relecteur : le vert pour l'approbation, le rouge pour les changements
 * demandés, l'or pour un commentaire ; une revue attendue reste neutre. `text` : la même couleur, pour un libellé.
 */
export const STATE_BADGES: Record<ReviewState, { icon: LucideIcon; tone: string; text: string }> = {
  APPROVED: { icon: Check, tone: 'bg-kente-jade text-kente-night', text: 'text-jade' },
  CHANGES_REQUESTED: { icon: FileDiff, tone: 'bg-kente-coral text-white', text: 'text-coral' },
  COMMENTED: { icon: MessageSquare, tone: 'bg-kente-gold text-kente-night', text: 'text-gold' },
  REQUESTED: { icon: Clock, tone: 'bg-surface text-faint-foreground ring-1 ring-border-strong', text: 'text-muted-foreground' },
};

/** Où en est une PR pour fusionner : ce que dit sa ligne de verdict */
export type MergeStatus =
  | { kind: 'merged' | 'closed' | 'draft' | 'changes' | 'ready' | 'noReviewer' }
  | { kind: 'awaiting'; count: number };

/**
 * Fusionnée, fermée, brouillon, des changements demandés, prête (tous les relecteurs requis ont approuvé), ou
 * combien de revues on attend encore.
 */
export function mergeStatusOf(pullRequest: Pick<PullRequest, 'status' | 'draft' | 'reviewers'>): MergeStatus {
  if (pullRequest.status === 'MERGED') {
    return { kind: 'merged' };
  }
  if (pullRequest.status === 'CLOSED') {
    return { kind: 'closed' };
  }
  if (pullRequest.draft) {
    return { kind: 'draft' };
  }
  if (pullRequest.reviewers.some((reviewer) => reviewer.state === 'CHANGES_REQUESTED')) {
    return { kind: 'changes' };
  }
  const required = pullRequest.reviewers.filter((reviewer) => reviewer.required);
  if (required.length > 0 && required.every((reviewer) => reviewer.state === 'APPROVED')) {
    return { kind: 'ready' };
  }
  const awaited = pullRequest.reviewers.filter((reviewer) => reviewer.state === 'REQUESTED').length;
  return awaited > 0 ? { kind: 'awaiting', count: awaited } : { kind: 'noReviewer' };
}

/** Ce que la PR fait d'un fichier : son pictogramme, sa couleur, et sa lettre comme dans Git (A, M, D, R) */
export const FILE_STATUSES: Record<PullRequestFileStatus, { icon: LucideIcon; tone: string; letter: string }> = {
  ADDED: { icon: FilePlus2, tone: 'text-jade', letter: 'A' },
  MODIFIED: { icon: FilePen, tone: 'text-gold', letter: 'M' },
  REMOVED: { icon: FileMinus2, tone: 'text-coral', letter: 'D' },
  RENAMED: { icon: FileSymlink, tone: 'text-soft-foreground', letter: 'R' },
  COPIED: { icon: FileSymlink, tone: 'text-soft-foreground', letter: 'C' },
};
