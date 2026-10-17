/**
 * Palette « Kente Signal » pour le code JavaScript : barre du navigateur, graphiques, canvas.
 * Les composants, eux, passent par les classes Tailwind (bg-kente-gold, text-jade…) :
 * la référence reste src/styles/tokens.css.
 */
export const palette = {
  /** Couleurs de marque, identiques dans les deux thèmes : or, rouge, vert */
  brand: { gold: '#ffb547', coral: '#ff5a4e', jade: '#22d3a6' },
  /** Fond de page de chaque thème, repris par la barre du navigateur sur mobile (meta theme-color) */
  themeColor: { light: '#f5f5f2', dark: '#07080d' },
} as const;
