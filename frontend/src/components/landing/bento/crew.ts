/**
 * L'équipe de lagos-transit, le projet que racontent les démos du bento (design 3B à 3E). Personnages
 * d'illustration, comme ceux des maquettes : leurs initiales seulement, sur une couleur du kente.
 */
export const CREW = {
  chinedu: { name: 'Chinedu', initials: 'CO', tint: 'bg-kente-gold' },
  tunde: { name: 'Tunde', initials: 'TA', tint: 'bg-kente-coral' },
  ama: { name: 'Ama', initials: 'AO', tint: 'bg-kente-jade' },
  kwame: { name: 'Kwame', initials: 'KA', tint: 'bg-kente-gold' },
  wanjiru: { name: 'Wanjiru', initials: 'WK', tint: 'bg-kente-coral' },
} as const;

export type CrewMember = keyof typeof CREW;
