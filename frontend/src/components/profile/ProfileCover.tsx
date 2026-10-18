import { m } from 'motion/react';
import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { clothGradient } from '@/lib/kenteCloth';
import { cn } from '@/lib/utils';

/**
 * Bannière du profil, à halos kente. Design 3F. L'étoffe est propre au membre, tirée de son pseudo : deux profils
 * n'ont pas le même kente, et le sien ne change jamais. Elle se tisse à l'arrivée, puis un reflet de soie la
 * traverse de temps en temps. Décorative.
 */
export default function ProfileCover({ username, className }: { username: string; className?: string }) {
  const { i18n } = useTranslation();
  const reduced = useReducedMotion();
  const cloth = useMemo(() => clothGradient(username), [username]);
  // L'étoffe avance dans le sens de l'écriture
  const unwoven = i18n.dir() === 'rtl' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';

  return (
    <div aria-hidden className={cn('profile-warp relative isolate h-36 overflow-hidden rounded-[1.75rem] sm:h-48 lg:h-56', className)}>
      <m.div
        key={username}
        initial={reduced ? false : { clipPath: unwoven }}
        animate={{ clipPath: 'inset(0 0% 0 0%)' }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        className="profile-cloth absolute inset-0"
        style={{ '--cloth': cloth } as CSSProperties}
      >
        <span className="profile-sheen" />
      </m.div>
      {/* Le bas de l'étoffe se fond dans la page, sous la photo */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background/45 to-transparent" />
    </div>
  );
}
