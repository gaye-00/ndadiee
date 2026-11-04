/** Un dépôt GitHub public, prêt à préremplir un projet (GithubRepositoryResponse.java). */
export interface GithubRepository {
  /** Compte propriétaire et sa photo */
  owner: string;
  ownerAvatarUrl: string | null;
  name: string;
  /** « owner/name » */
  fullName: string;
  /** https://github.com/owner/name */
  repositoryUrl: string;
  description: string | null;
  /** Site du projet, adresse complète */
  homepage: string | null;
  /** Identifiant SPDX (« MIT ») ; null si aucune licence ou non reconnue */
  license: string | null;
  /** Langages, le plus présent d'abord */
  languages: string[];
  topics: string[];
  /** Technologies proposées : langages principaux puis sujets, sous le nom des tags déjà connus (8 au plus) */
  suggestedTags: string[];
  /** L'introduction du README, en paragraphes et listes */
  readmeExcerpt: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  archived: boolean;
  fork: boolean;
  pushedAt: string | null;
  /** Un projet de la vitrine pointe déjà vers ce dépôt : son slug */
  listedProjectSlug: string | null;
}

/** Un dépôt du membre connecté, à importer en un clic (GithubRepositorySummaryResponse.java). */
export interface GithubRepositorySummary {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string | null;
  listedProjectSlug: string | null;
}
