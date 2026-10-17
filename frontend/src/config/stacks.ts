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
