import type { StackLogoId } from '@/lib/stackLogos';
import type { TeamRole } from '@/types/project.types';

/**
 * Rôles que les équipes recherchent : un seul catalogue pour l'accueil (landing/RolesMarquee) et les
 * annonces. Libellés : section `teamRoles` des traductions.
 *
 * Chaque rôle a son motif. Sur une bande de kente, le tisserand fait flotter des fils de trame
 * supplémentaires par-dessus la chaîne pour dessiner une figure : ici, une par métier
 * (shared/WovenMotif.tsx). Une ligne par rangée de fils : « # » première couleur, « + » seconde,
 * « o » couleur du texte, « . » rien.
 */

export type KenteThread = 'gold' | 'coral' | 'jade';

/** Identifiant d'un rôle : celui du backend (TeamRole.java), en minuscules (« mobile », « l10n ») */
export type TeamRoleId = Lowercase<TeamRole>;

/** Une technologie du métier : son nom, et son logo quand Simple Icons en a un (lib/stackLogos.ts) */
export interface StackItem {
  name: string;
  logo?: StackLogoId;
}

export interface RoleDefinition {
  id: TeamRoleId;
  /** Couleurs du motif : « # » puis « + » */
  colors: readonly [KenteThread, KenteThread];
  motif: readonly string[];
  stack: readonly StackItem[];
}

// Dans l'ordre de la bande. Deux rôles voisins n'ont jamais la même couleur, d'un tour à l'autre aussi.
export const teamRoles: readonly RoleDefinition[] = [
  {
    id: 'frontend',
    colors: ['gold', 'jade'],
    // </>
    motif: [
      '..................',
      '.........++.......',
      '....##...++.##....',
      '...##....++..##...',
      '..##.....++...##..',
      '.##.....++.....##.',
      '##......++......##',
      '##......++......##',
      '##......++......##',
      '.##.....++.....##.',
      '..##...++.....##..',
      '...##..++....##...',
      '....##.++...##....',
      '.......++.........',
      '..................',
    ],
    stack: [
      { name: 'React', logo: 'react' },
      { name: 'Vue', logo: 'vuedotjs' },
      { name: 'Svelte', logo: 'svelte' },
    ],
  },
  {
    id: 'backend',
    colors: ['coral', 'gold'],
    // Baie de serveurs, voyants allumés
    motif: [
      '.############.',
      '##++##.....###',
      '##++##.....###',
      '.############.',
      '..............',
      '.############.',
      '##++##.....###',
      '##++##.....###',
      '.############.',
      '..............',
      '.############.',
      '##++##.....###',
      '##++##.....###',
      '.############.',
    ],
    stack: [
      { name: 'Spring Boot', logo: 'springboot' },
      { name: 'Node.js', logo: 'nodedotjs' },
      { name: 'Laravel', logo: 'laravel' },
    ],
  },
  {
    id: 'mobile',
    colors: ['jade', 'gold'],
    // Téléphone, une appli à l'écran
    motif: [
      '.#######.',
      '###.#.###',
      '##+++++##',
      '##+ooo+##',
      '##+++++##',
      '##+o+o+##',
      '##+++++##',
      '##+o+o+##',
      '##+++++##',
      '##+++++##',
      '##+++++##',
      '#########',
      '###...###',
      '#########',
      '.#######.',
    ],
    stack: [
      { name: 'Flutter', logo: 'flutter' },
      { name: 'Kotlin', logo: 'kotlin' },
      { name: 'React Native', logo: 'react' },
    ],
  },
  {
    id: 'design',
    colors: ['gold', 'coral'],
    // Plume de l'outil « Plume » des logiciels de dessin
    motif: [
      '...+++++...',
      '...+++++...',
      '...........',
      '..#######..',
      '.#########.',
      '###########',
      '####...####',
      '####...####',
      '####...####',
      '.####.####.',
      '.####.####.',
      '..###.###..',
      '...##.##...',
      '....#.#....',
      '.....#.....',
    ],
    stack: [
      { name: 'Figma', logo: 'figma' },
      { name: 'Penpot', logo: 'penpot' },
    ],
  },
  {
    id: 'data',
    colors: ['coral', 'jade'],
    // Histogramme, une étincelle pour l'IA
    motif: [
      '...........',
      '.o.........',
      'ooo......++',
      '.o.......++',
      '.........++',
      '...++....++',
      '...++....++',
      '...++.##.++',
      '##.++.##.++',
      '##.++.##.++',
      '##.++.##.++',
      '##.++.##.++',
      '##.++.##.++',
      '##.++.##.++',
    ],
    stack: [
      { name: 'Python', logo: 'python' },
      { name: 'pandas', logo: 'pandas' },
      { name: 'PyTorch', logo: 'pytorch' },
    ],
  },
  {
    id: 'devops',
    colors: ['jade', 'coral'],
    // Boucle infinie : les deux fils passent l'un sur l'autre au croisement
    motif: [
      '....###.....+++....',
      '..#######.+++++++..',
      '.#########++++++++.',
      '.###...###++...+++.',
      '###.....###.....+++',
      '###.....+++.....+++',
      '###.....+++.....+++',
      '.###...##+++...+++.',
      '.########+++++++++.',
      '..#######.+++++++..',
      '....###.....+++....',
    ],
    stack: [
      { name: 'Docker', logo: 'docker' },
      { name: 'Kubernetes', logo: 'kubernetes' },
      { name: 'Terraform', logo: 'terraform' },
    ],
  },
  {
    id: 'security',
    colors: ['gold', 'jade'],
    // Bouclier et serrure
    motif: [
      '......#......',
      '....#####....',
      '..#########..',
      '#############',
      '######+######',
      '#####+++#####',
      '#####+++#####',
      '######+######',
      '.#####+#####.',
      '.####+++####.',
      '..###+++###..',
      '...#######...',
      '....#####....',
      '.....###.....',
      '......#......',
    ],
    stack: [
      { name: 'OWASP', logo: 'owasp' },
      { name: "Let's Encrypt", logo: 'letsencrypt' },
      { name: 'Keycloak', logo: 'keycloak' },
    ],
  },
  {
    id: 'payments',
    colors: ['coral', 'gold'],
    // « *# » : les codes USSD qu'on tape pour payer sans internet (*144#)
    motif: [
      '...+.............',
      '+..+..+..........',
      '.+.+.+...........',
      '..+++.....##..##.',
      '.+.+.+....##..##.',
      '+..+..+..########',
      '...+.....########',
      '..........##..##.',
      '.........########',
      '.........########',
      '..........##..##.',
      '..........##..##.',
    ],
    stack: [{ name: 'M-Pesa' }, { name: 'MoMo' }, { name: 'USSD' }],
  },
  {
    id: 'l10n',
    colors: ['jade', 'gold'],
    // Deux bulles : une lettre, une réponse
    motif: [
      '.#########......',
      '####o######.....',
      '###o#o#####.....',
      '###o#o#####.....',
      '##ooooo####.....',
      '##o###o####.....',
      '##o###o.........',
      '#######..++++++.',
      '.######.++++++++',
      '.##.....++++++++',
      '.#......+.+.+.++',
      '........++++++++',
      '........++++++++',
      '.........++++++.',
      '.............++.',
    ],
    stack: [{ name: 'Wolof' }, { name: 'Yorùbá' }, { name: 'Kiswahili' }],
  },
  {
    id: 'docs',
    colors: ['gold', 'coral'],
    // Page au coin plié
    motif: [
      '#######+...',
      '#######++..',
      '#######+++.',
      '#######++++',
      '###########',
      '##.......##',
      '###########',
      '##......###',
      '###########',
      '##.......##',
      '###########',
      '##....#####',
      '###########',
      '###########',
    ],
    stack: [{ name: 'Markdown', logo: 'markdown' }, { name: 'Docusaurus' }],
  },
  {
    id: 'product',
    colors: ['coral', 'jade'],
    // Kanban : à faire, en cours, fait
    motif: [
      '###.+++.ooo',
      '...........',
      '###.+++.ooo',
      '###.+++.ooo',
      '###.+++.ooo',
      '...........',
      '###.+++....',
      '###.+++....',
      '###.+++....',
      '...........',
      '###........',
      '###........',
      '###........',
    ],
    stack: [
      { name: 'GitHub', logo: 'github' },
      { name: 'Notion', logo: 'notion' },
      { name: 'Trello', logo: 'trello' },
    ],
  },
  {
    id: 'embedded',
    colors: ['jade', 'gold'],
    // Puce et ses broches
    motif: [
      '....#.#.#.#....',
      '....#.#.#.#....',
      '..###########..',
      '..###########..',
      '####+++++++####',
      '..##+++++++##..',
      '####+++++++####',
      '..##+++++++##..',
      '####+++++++####',
      '..##+++++++##..',
      '####+++++++####',
      '..###########..',
      '..###########..',
      '....#.#.#.#....',
      '....#.#.#.#....',
    ],
    stack: [
      { name: 'Arduino', logo: 'arduino' },
      { name: 'ESP32', logo: 'espressif' },
      { name: 'MicroPython', logo: 'micropython' },
    ],
  },
  {
    id: 'qa',
    colors: ['coral', 'gold'],
    // Case cochée
    motif: [
      '.###########.',
      '#############',
      '##########o##',
      '#########oo##',
      '########oo###',
      '##o####oo####',
      '##oo##oo#####',
      '###oooo######',
      '####oo#######',
      '#############',
      '.###########.',
    ],
    stack: [
      { name: 'Vitest', logo: 'vitest' },
      { name: 'Cypress', logo: 'cypress' },
      { name: 'JUnit', logo: 'junit5' },
    ],
  },
];

const byId = new Map(teamRoles.map((role) => [role.id, role]));

/** Le rôle du catalogue qui correspond à un rôle venu du backend (« MOBILE » → mobile). */
export function roleOf(role: TeamRole): RoleDefinition | undefined {
  return byId.get(role.toLowerCase() as TeamRoleId);
}
