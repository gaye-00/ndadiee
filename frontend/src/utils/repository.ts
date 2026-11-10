/**
 * Les adresses d'un projet (dépôt, démo) et ce qu'on en fait : lire le code dans Ndadiee, ou ouvrir le lien.
 *
 * Les projets de démonstration ont des adresses en example.com, un domaine réservé à la documentation (RFC 2606) :
 * elles ne mènent nulle part. Leur code est fourni avec l'application (DemoRepositories.java), et leur démo a sa page
 * d'attente plutôt qu'un lien mort.
 */

// Domaines réservés aux exemples et aux tests (RFC 2606, RFC 6761)
const RESERVED_HOST = /(^|\.)(example\.(com|net|org)|example|test|invalid|localhost)$/i;
/** Un dépôt GitHub : « https://github.com/owner/name », avec ou sans www ni « .git », suivi ou non d'un chemin */
const GITHUB_REPOSITORY = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/([^/?#\s]+?)(?:\.git)?(?:[/?#].*)?$/i;
/** Un dépôt de démonstration, servi par l'API (même motif que DemoRepositories.java) */
const DEMO_REPOSITORY = /^https?:\/\/(?:www\.)?example\.com\/ndadiee-demo\/[a-z0-9][a-z0-9-]{0,99}\/?$/i;

/** L'adresse ne mène nulle part : un domaine réservé aux exemples, ou une adresse illisible. */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    return RESERVED_HOST.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

/** D'où vient le code qu'on lit dans Ndadiee : un dépôt GitHub public, ou un dépôt de démonstration */
export type CodeSource = 'github' | 'demo';

/** Le code de ce dépôt se lit dans Ndadiee ; null s'il est ailleurs (GitLab, un site…) et s'ouvre dans un onglet. */
export function codeSourceOf(repositoryUrl: string | null | undefined): CodeSource | null {
  if (!repositoryUrl) {
    return null;
  }
  const url = repositoryUrl.trim();
  if (DEMO_REPOSITORY.test(url)) {
    return 'demo';
  }
  return GITHUB_REPOSITORY.test(url) ? 'github' : null;
}

/** L'issue « premier pas » d'un rôle, sur le dépôt du projet ; null sans dépôt, ou pour un dépôt fictif. */
export function starterIssueUrl(repositoryUrl: string | null | undefined, issueNumber: number | null | undefined): string | null {
  if (!repositoryUrl || !issueNumber || isPlaceholderUrl(repositoryUrl)) {
    return null;
  }
  return `${repositoryUrl.replace(/\/+$/, '')}/issues/${issueNumber}`;
}
