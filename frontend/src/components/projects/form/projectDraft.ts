import { z } from 'zod';
import i18n from '@/i18n';
import type { UserResponse } from '@/types/auth.types';
import type { MediaKind, NewProjectRequest, Project, TeamRole } from '@/types/project.types';
// Les messages d'erreur des schémas, dans la langue de l'interface (z.config)
import '@/utils/validators';

// Limites du projet (ProjectRequest.java, NewProjectRequest.java, ProjectMediaRequest.java, ProjectOpeningRequest.java)
export const LIMITS = {
  name: 100,
  tagline: 200,
  description: 10_000,
  url: 500,
  license: 40,
  tags: 8,
  tag: 50,
  gallery: 12,
  caption: 200,
  credit: 200,
  roles: 8,
  roleTitle: 120,
  roleDescription: 500,
  seats: 20,
  issueTitle: 200,
} as const;

/** Une image envoyée : la grande (1280 px), sa miniature (640 px), et les dimensions de la grande */
export interface DraftImage {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

/** Une image de la galerie, avec ce qu'en dit le porteur */
export interface DraftShot extends DraftImage {
  id: string;
  kind: MediaKind;
  caption: string;
  /** Image empruntée : auteur et licence, et lien vers sa source */
  credit: string;
  sourceUrl: string;
}

/** Un rôle recherché (une annonce du projet) */
export interface DraftRole {
  id: string;
  role: TeamRole;
  title: string;
  description: string;
  seats: number;
  /** Numéro de l'issue « premier pas », tel que saisi */
  starterIssueNumber: string;
  starterIssueTitle: string;
}

/** Le projet en cours d'écriture : gardé en brouillon sur l'appareil à chaque pause dans la frappe */
export interface ProjectDraft {
  name: string;
  tagline: string;
  tags: string[];
  description: string;
  repositoryUrl: string;
  demoUrl: string;
  license: string;
  cover: DraftImage | null;
  coverCredit: string;
  coverSourceUrl: string;
  gallery: DraftShot[];
  recruiting: boolean;
  roles: DraftRole[];
}

export const EMPTY_DRAFT: ProjectDraft = {
  name: '',
  tagline: '',
  tags: [],
  description: '',
  repositoryUrl: '',
  demoUrl: '',
  license: '',
  cover: null,
  coverCredit: '',
  coverSourceUrl: '',
  gallery: [],
  recruiting: false,
  roles: [],
};

export const isDraftEmpty = (draft: ProjectDraft) =>
  !draft.name.trim() &&
  !draft.tagline.trim() &&
  draft.tags.length === 0 &&
  !draft.description.trim() &&
  !draft.repositoryUrl.trim() &&
  !draft.demoUrl.trim() &&
  !draft.cover &&
  draft.gallery.length === 0 &&
  draft.roles.length === 0;

/** Un brouillon d'une version précédente du formulaire : les champs qu'il n'a pas prennent leur valeur vide */
export const completeDraft = (draft: Partial<ProjectDraft> | null | undefined): ProjectDraft => ({ ...EMPTY_DRAFT, ...draft });

/** Identifiant d'une image ou d'un rôle, stable dans le brouillon */
export const draftId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Une adresse web complète, en http(s) */
export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Une adresse saisie sans https:// (« lagos-transit.app ») le reçoit : la plupart des gens l'omettent */
export function withScheme(value: string): string {
  const text = value.trim();
  return text && !/^[a-z][a-z\d+.-]*:/i.test(text) ? `https://${text}` : text;
}

const optionalUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine((value) => !value || isWebUrl(value), { error: () => i18n.t('projectForm:errors.url') });

const text = (max: number) => z.string().trim().max(max);

/** Mêmes règles que le backend : le formulaire les signale tout de suite, le serveur reste la référence. */
export const projectDraftSchema = z.object({
  name: z.string().trim().min(3).max(LIMITS.name),
  tagline: text(LIMITS.tagline),
  tags: z.array(z.string().trim().min(1).max(LIMITS.tag)).max(LIMITS.tags),
  description: z.string().trim().min(1).max(LIMITS.description),
  repositoryUrl: optionalUrl,
  demoUrl: optionalUrl,
  license: text(LIMITS.license),
  coverCredit: text(LIMITS.credit),
  coverSourceUrl: optionalUrl,
  gallery: z
    .array(z.object({ caption: text(LIMITS.caption), credit: text(LIMITS.credit), sourceUrl: optionalUrl }))
    .max(LIMITS.gallery),
  roles: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(LIMITS.roleTitle),
        description: text(LIMITS.roleDescription),
        seats: z.number().int().min(1).max(LIMITS.seats),
        starterIssueNumber: z.string().trim().regex(/^\d{0,9}$/, { error: () => i18n.t('projectForm:errors.issueNumber') }),
        starterIssueTitle: text(LIMITS.issueTitle),
      }),
    )
    .max(LIMITS.roles),
});

/** Les erreurs du formulaire, par chemin : « name », « gallery.2.caption », « roles.0.title », « form » */
export type DraftErrors = Record<string, string>;

/** Valide le brouillon : les rôles ne comptent que si le projet recrute. */
export function validateDraft(draft: ProjectDraft): DraftErrors {
  const parsed = projectDraftSchema.safeParse({ ...draft, roles: draft.recruiting ? draft.roles : [] });
  if (parsed.success) {
    return {};
  }
  const errors: DraftErrors = {};
  parsed.error.issues.forEach((issue) => {
    errors[issue.path.join('.')] ??= issue.message;
  });
  return errors;
}

/**
 * Les erreurs renvoyées par le backend, au chemin des champs du formulaire : « openings[0].title » devient
 * « roles.0.title », « coverUrl » devient « cover ».
 */
export function draftErrorsOf(validationErrors: Record<string, string>): DraftErrors {
  const errors: DraftErrors = {};
  Object.entries(validationErrors).forEach(([field, message]) => {
    const path = field
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/^openings\b/, 'roles')
      .replace(/^(coverUrl|coverThumbnailUrl)$/, 'cover')
      .replace(/^tags\.\d+$/, 'tags')
      .replace(/^lookingForContributors$/, 'roles');
    errors[path] ??= message;
  });
  return errors;
}

const orUndefined = (value: string) => value.trim() || undefined;

/** Le brouillon, tel que le backend le publie (POST /v1/projects) */
export function toProjectRequest(draft: ProjectDraft): NewProjectRequest {
  return {
    name: draft.name.trim(),
    tagline: orUndefined(draft.tagline),
    description: draft.description.trim(),
    repositoryUrl: orUndefined(draft.repositoryUrl),
    demoUrl: orUndefined(draft.demoUrl),
    license: orUndefined(draft.license),
    coverUrl: draft.cover?.url,
    coverThumbnailUrl: draft.cover?.thumbnailUrl,
    coverCredit: draft.cover ? orUndefined(draft.coverCredit) : undefined,
    coverSourceUrl: draft.cover ? orUndefined(draft.coverSourceUrl) : undefined,
    tags: draft.tags,
    lookingForContributors: draft.recruiting,
    gallery: draft.gallery.map((shot) => ({
      kind: shot.kind,
      url: shot.url,
      thumbnailUrl: shot.thumbnailUrl,
      caption: orUndefined(shot.caption),
      credit: orUndefined(shot.credit),
      sourceUrl: orUndefined(shot.sourceUrl),
      width: shot.width,
      height: shot.height,
    })),
    openings: draft.recruiting
      ? draft.roles.map((role) => ({
          role: role.role,
          title: role.title.trim(),
          description: orUndefined(role.description),
          seats: role.seats,
          starterIssueNumber: role.starterIssueNumber.trim() ? Number(role.starterIssueNumber) : undefined,
          starterIssueTitle: role.starterIssueNumber.trim() ? orUndefined(role.starterIssueTitle) : undefined,
        }))
      : [],
  };
}

/** Les étapes d'un projet complet, dans l'ordre du formulaire ; chacune mène à son champ */
export type ChecklistItem = 'name' | 'tagline' | 'stack' | 'cover' | 'gallery' | 'story' | 'links' | 'roles';

// Assez pour donner envie : une accroche qui dit quelque chose, un récit de quelques phrases
export const GOOD_TAGLINE = 20;
export const GOOD_STORY = 160;
export const GOOD_STACK = 2;

/** Ce qui est fait, et ce qui reste ; « Rôles recherchés » seulement pour un projet qui recrute */
export function checklistOf(draft: ProjectDraft): Array<{ item: ChecklistItem; done: boolean }> {
  const items: Array<{ item: ChecklistItem; done: boolean }> = [
    { item: 'name', done: draft.name.trim().length >= 3 },
    { item: 'tagline', done: draft.tagline.trim().length >= GOOD_TAGLINE },
    { item: 'stack', done: draft.tags.length >= GOOD_STACK },
    { item: 'cover', done: draft.cover !== null },
    { item: 'gallery', done: draft.gallery.length > 0 },
    { item: 'story', done: draft.description.trim().length >= GOOD_STORY },
    { item: 'links', done: isWebUrl(draft.repositoryUrl) || isWebUrl(draft.demoUrl) },
  ];
  if (draft.recruiting) {
    items.push({ item: 'roles', done: draft.roles.some((role) => role.title.trim()) });
  }
  return items;
}

/**
 * Le projet tel que la vitrine et sa page le montreront, pour l'aperçu : les champs qui ne viennent pas du
 * formulaire (étoiles, équipe, activité GitHub) prennent la valeur d'un projet qui vient de naître.
 */
export function previewProjectOf(draft: ProjectDraft, user: UserResponse | null): Project {
  const now = new Date().toISOString();
  const owner = {
    id: user?.id ?? 0,
    username: user?.username ?? 'me',
    fullName: user?.fullName ?? '',
    avatarUrl: user?.avatarUrl ?? null,
    country: user?.country ?? null,
    reputation: user?.reputation ?? null,
    level: user?.level ?? null,
  };
  return {
    id: 0,
    name: draft.name.trim() || i18n.t('projectForm:preview.untitled'),
    slug: 'preview',
    tagline: draft.tagline.trim() || null,
    description: draft.description.trim() || null,
    repositoryUrl: isWebUrl(draft.repositoryUrl) ? draft.repositoryUrl.trim() : null,
    demoUrl: isWebUrl(draft.demoUrl) ? draft.demoUrl.trim() : null,
    logoUrl: null,
    coverUrl: draft.cover?.url ?? null,
    coverThumbnailUrl: draft.cover?.thumbnailUrl ?? null,
    coverCredit: draft.cover ? draft.coverCredit.trim() || null : null,
    coverSourceUrl: draft.cover && isWebUrl(draft.coverSourceUrl) ? draft.coverSourceUrl.trim() : null,
    license: draft.license.trim() || null,
    hackathon: null,
    owner,
    tags: draft.tags.map((name, index) => ({
      id: -(index + 1),
      name,
      slug: name.toLowerCase().replace(/[^a-z\d+#.]+/g, '-'),
      description: null,
      usageCount: 0,
      followedByMe: null,
    })),
    lookingForContributors: draft.recruiting,
    starsCount: 0,
    memberCount: 1,
    openings: draft.recruiting
      ? draft.roles
          .filter((role) => role.title.trim())
          .map((role, index) => ({
            id: -(index + 1),
            role: role.role,
            title: role.title.trim(),
            description: role.description.trim() || null,
            seats: role.seats,
            starterIssueNumber: role.starterIssueNumber.trim() ? Number(role.starterIssueNumber) : null,
            starterIssueTitle: role.starterIssueTitle.trim() || null,
            open: true,
            createdAt: now,
            project: null,
            applicants: 0,
            match: null,
            appliedByMe: null,
          }))
      : [],
    team: [owner],
    gallery: draft.gallery.map((shot, index) => ({
      id: -(index + 1),
      kind: shot.kind,
      url: shot.url,
      thumbnailUrl: shot.thumbnailUrl,
      caption: shot.caption.trim() || null,
      credit: shot.credit.trim() || null,
      sourceUrl: isWebUrl(shot.sourceUrl) ? shot.sourceUrl.trim() : null,
      width: shot.width,
      height: shot.height,
    })),
    github: null,
    // L'aperçu montre le projet tel qu'un visiteur le verra
    starredByMe: null,
    myMembershipStatus: null,
    hidden: false,
    hiddenReason: null,
    createdAt: now,
    updatedAt: now,
  };
}
