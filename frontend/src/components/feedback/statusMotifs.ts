import type { KenteThread } from '@/config/roles';

/** Une figure tissée d'une page d'état : ses rangées (voir shared/WovenMotif.tsx) et ses deux fils */
export interface StatusMotif {
  motif: readonly string[];
  colors: readonly [KenteThread, KenteThread];
}

const FOUR = [
  '........###.',
  '.......####.',
  '......#####.',
  '.....###+##.',
  '....###.+##.',
  '...###..+##.',
  '..###...+##.',
  '.###....+##.',
  '###.....+##.',
  '############',
  '############',
  '........+##.',
  '........+##.',
  '........+##.',
  '........+##.',
];

// Le zéro porte en son milieu le losange des kente
const ZERO = [
  '...######...',
  '..########..',
  '.###....###.',
  '###......###',
  '###......###',
  '###..++..###',
  '###.++++.###',
  '###.++++.###',
  '###.++++.###',
  '###..++..###',
  '###......###',
  '###......###',
  '.###....###.',
  '..########..',
  '...######...',
];

const WARNING = [
  '..####..',
  '.######.',
  '.######.',
  '.######.',
  '.######.',
  '..####..',
  '..####..',
  '..####..',
  '...##...',
  '...##...',
  '........',
  '..++++..',
  '.++++++.',
  '.++++++.',
  '..++++..',
];

const NEWER = [
  '.....++.....',
  '....++++....',
  '...++++++...',
  '..++++++++..',
  '.++++++++++.',
  '+++.####.+++',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
  '............',
  '.##########.',
  '.##########.',
];

const SIGNAL = [
  '..............',
  '...########...',
  '.####....####.',
  '###........###',
  '##...####...##',
  '...########...',
  '..###....###..',
  '..##......##..',
  '.....####.....',
  '....######....',
  '..............',
  '......++......',
  '.....++++.....',
  '.....++++.....',
  '......++......',
];

/** « 404 », tissé chiffre après chiffre */
export const NOT_FOUND_MOTIFS: readonly StatusMotif[] = [
  { motif: FOUR, colors: ['gold', 'coral'] },
  { motif: ZERO, colors: ['jade', 'gold'] },
  { motif: FOUR, colors: ['coral', 'jade'] },
];

export const CRASH_MOTIFS: readonly StatusMotif[] = [{ motif: WARNING, colors: ['coral', 'gold'] }];
export const UPDATE_MOTIFS: readonly StatusMotif[] = [{ motif: NEWER, colors: ['gold', 'jade'] }];
export const OFFLINE_MOTIFS: readonly StatusMotif[] = [{ motif: SIGNAL, colors: ['gold', 'coral'] }];
