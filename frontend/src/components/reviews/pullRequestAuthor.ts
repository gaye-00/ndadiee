import type { PullRequest } from '@/types/review.types';
import type { UserSummary } from '@/types/user.types';

/** L'auteur d'une PR, tel que UserAvatar l'attend */
export interface PullRequestAuthor {
  user: Pick<UserSummary, 'id' | 'fullName' | 'username' | 'avatarUrl'>;
  /** Un compte GitHub qui n'est pas inscrit sur Ndadiee */
  github: boolean;
}

// La couleur des initiales d'un compte GitHub : toujours la même pour un même compte
function tintOf(login: string): number {
  let hash = 0;
  for (const char of login) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

/**
 * L'auteur d'une PR : le membre qui l'a ouverte, ou, pour une PR de GitHub dont l'auteur n'est pas inscrit, son compte
 * GitHub (« ghost » si le compte a été supprimé, comme sur GitHub).
 */
export function pullRequestAuthor(pullRequest: Pick<PullRequest, 'author' | 'github'>): PullRequestAuthor {
  if (pullRequest.author) {
    return { user: pullRequest.author, github: false };
  }
  const login = pullRequest.github?.authorLogin ?? 'ghost';
  return {
    user: { id: tintOf(login), fullName: login, username: login, avatarUrl: pullRequest.github?.authorAvatarUrl ?? null },
    github: true,
  };
}
