import type { TFunction } from 'i18next';
import type { SearchHit } from '@/hooks/useSearch';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';
import { countryName, isolate } from '@/utils/formatters';

/** Identifiant d'un résultat, unique tous groupes confondus */
export function hitKey(hit: SearchHit): string {
  switch (hit.group) {
    case 'roles':
      return `role-${hit.opening.id}`;
    case 'projects':
      return `project-${hit.project.id}`;
    case 'people':
      return `person-${hit.user.id}`;
    case 'topics':
      return `topic-${hit.topic.id}`;
  }
}

/** Où mène un résultat : un rôle s'ouvre près des autres rôles de son projet, et s'éclaire */
export function hitLink(hit: SearchHit): string {
  switch (hit.group) {
    case 'roles':
      return paths.projectRoles(hit.opening.project.slug, hit.opening.id);
    case 'projects':
      return paths.project(hit.project.slug);
    case 'people':
      return paths.profile(hit.user.username);
    case 'topics':
      return paths.topic(hit.topic.slug);
  }
}

/** Le code de la page où il mène, à précharger au survol */
export function hitPage(hit: SearchHit): PageImport {
  switch (hit.group) {
    case 'roles':
    case 'projects':
      return pages.project;
    case 'people':
      return pages.profile;
    case 'topics':
      return pages.topic;
  }
}

/** Son titre : c'est là que la recherche s'éclaire */
export function hitTitle(hit: SearchHit): string {
  switch (hit.group) {
    case 'roles':
      return hit.opening.title;
    case 'projects':
      return hit.project.name;
    case 'people':
      return hit.user.fullName || hit.user.username;
    case 'topics':
      return hit.topic.title;
  }
}

/** Ce qui le distingue des autres, sur une ligne */
export function hitSubtitle(hit: SearchHit, t: TFunction): string {
  switch (hit.group) {
    case 'roles': {
      const { opening } = hit;
      return [isolate(opening.project.name), t('search.seats', { count: opening.seats })].join(' · ');
    }
    case 'projects':
      return hit.project.tagline ?? isolate(hit.project.owner.fullName);
    case 'people': {
      const country = countryName(hit.user.country);
      return [`@${hit.user.username}`, ...(country ? [country] : [])].join(' · ');
    }
    case 'topics': {
      const { topic } = hit;
      return [t('forum.replies', { count: topic.answerCount }), ...(topic.hasAcceptedAnswer ? [t('forum.solved')] : [])].join(' · ');
    }
  }
}
