/**
 * Le slug d'un tag, comme le backend le calcule (SlugService.java) : deux saisies au même slug (« Spring Boot »,
 * « spring-boot ») désignent le même tag. Sert aux logos des technologies (config/stacks.ts) et à repérer les doublons
 * (technologies d'un projet, compétences d'un profil).
 */
export function tagSlug(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\+\+/g, 'pp')
    .replace(/#/g, 'sharp')
    .replace(/^\./, 'dot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deux saisies qui désignent le même tag */
export const sameTag = (a: string, b: string) => tagSlug(a) === tagSlug(b);
