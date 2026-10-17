import { alignWithPageClock } from '@/lib/pageClock';
import { cn } from '@/lib/utils';

interface PulsatingDotsProps {
  /** md : points de 12 px, pour une page ou un bloc ; sm : la place d'une icône de 16 px (bouton, champ, notification) */
  size?: 'sm' | 'md';
  /** kente : or, rouge et vert ; current : la couleur du texte autour, pour un bouton ou un aplat de couleur */
  tone?: 'kente' | 'current';
  /**
   * Ce que disent les lecteurs d'écran (« Chargement… »). Sans lui, les points sont décoratifs : le texte
   * à côté (« Tissage… ») dit déjà ce qui se passe.
   */
  label?: string;
  className?: string;
}

/**
 * Le loader de l'application : trois points or, rouge et vert qui grossissent et s'allument l'un après
 * l'autre (modèle 21st.dev « Pulsating Dots »). L'animation est en CSS (styles/effects.css) : elle tourne
 * avant même que Motion soit téléchargé, continue sans mouvement ni gros calcul quand les animations sont
 * réduites, et le loader de index.html, en HTML pur, est le même. Tous ceux de l'écran battent en mesure.
 */
export default function PulsatingDots({ size = 'md', tone = 'kente', label, className }: PulsatingDotsProps) {
  return (
    <span
      ref={alignWithPageClock}
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      data-size={size}
      data-tone={tone}
      className={cn('pulsating-dots', className)}
    >
      <span className="pulsating-dot" />
      <span className="pulsating-dot" />
      <span className="pulsating-dot" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
