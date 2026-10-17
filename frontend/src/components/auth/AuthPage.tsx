import { ArrowRight } from 'lucide-react';
import { m, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { prefetch } from '@/lib/prefetch';

// Les blocs de la page arrivent l'un après l'autre
const PAGE: Variants = { shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const BLOCK: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

interface AuthPageProps {
  eyebrow: string;
  title: string;
  text: string;
  /** Le formulaire */
  children: ReactNode;
  /** L'autre page : « Pas encore de compte ? Créer un compte » */
  other: { question: string; label: string; to: string; preload: () => Promise<unknown> };
}

/**
 * Le gabarit des pages de connexion et d'inscription : titre, formulaire, et le chemin vers l'autre page,
 * qui garde la page protégée qu'on voulait atteindre (posée par ProtectedRoute).
 */
export default function AuthPage({ eyebrow, title, text, children, other }: AuthPageProps) {
  const location = useLocation();

  return (
    <m.div initial="hidden" animate="shown" variants={PAGE}>
      <m.header variants={BLOCK} className="mb-8">
        <p className="eyebrow text-gold!">{eyebrow}</p>
        <h1 className="mt-3 font-display text-h2">{title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{text}</p>
      </m.header>

      <m.div variants={BLOCK}>{children}</m.div>

      <m.p variants={BLOCK} className="mt-8 text-center text-sm text-muted-foreground">
        {other.question}{' '}
        <Link
          to={other.to}
          state={location.state}
          viewTransition
          onPointerEnter={() => prefetch(other.preload)}
          onFocus={() => prefetch(other.preload)}
          className="group/other inline-flex items-center gap-1 rounded-full font-semibold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {other.label}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover/other:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/other:-translate-x-0.5"
          />
        </Link>
      </m.p>
    </m.div>
  );
}
