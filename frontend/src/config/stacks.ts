import { teamRoles } from './roles';
import type { StackLogoId } from '@/lib/stackLogos';

/**
 * Logo de chaque technologie, par slug de tag (table `tags` du backend). Les sujets (« Open Data »,
 * « API », « IoT ») n'en ont pas : c'est ce qui distingue une technologie d'un sujet sur l'accueil.
 */
export const tagLogos: Readonly<Record<string, StackLogoId>> = {
  dart: 'dart',
  docker: 'docker',
  esp32: 'espressif',
  firebase: 'firebase',
  flutter: 'flutter',
  go: 'go',
  graphql: 'graphql',
  java: 'openjdk',
  kotlin: 'kotlin',
  kubernetes: 'kubernetes',
  laravel: 'laravel',
  micropython: 'micropython',
  'node-js': 'nodedotjs',
  postgresql: 'postgresql',
  python: 'python',
  react: 'react',
  // Pas de logo à part dans Simple Icons : c'est celui de React
  'react-native': 'react',
  redis: 'redis',
  'spring-boot': 'springboot',
  terraform: 'terraform',
  'vue-js': 'vuedotjs',
};

/** Le logo d'une technologie, s'il y en a un. */
export function tagLogoOf(slug: string): StackLogoId | undefined {
  return Object.hasOwn(tagLogos, slug) ? tagLogos[slug] : undefined;
}

// Technologies reconnues, par leur nom : celles des métiers (config/roles.ts) et les plus courantes
const TECHNOLOGIES = new Set(
  [
    ...teamRoles.flatMap((role) => role.stack.map((item) => item.name)),
    ...['Java', 'Kotlin', 'Go', 'Python', 'TypeScript', 'JavaScript', 'Dart', 'PHP', 'Rust', 'Swift', 'C#', 'Ruby', 'Elixir'],
    ...['Flutter', 'React Native', 'Angular', 'Next.js', 'Django', 'GraphQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase'],
  ].map((name) => name.toLowerCase()),
);

/**
 * Une technologie connue (« Flutter », « Go ») plutôt qu'un sujet (« Open Data », « IoT ») : les cartes de la
 * vitrine la citent d'abord.
 */
export function isTechnology(name: string): boolean {
  return TECHNOLOGIES.has(name.toLowerCase());
}
