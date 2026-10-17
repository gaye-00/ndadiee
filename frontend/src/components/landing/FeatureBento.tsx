import { MotionConfig } from 'motion/react';
import { useRef, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import DailyCard from '@/components/landing/bento/DailyCard';
import MeetCard from '@/components/landing/bento/MeetCard';
import ReviewCard from '@/components/landing/bento/ReviewCard';
import ShareCard from '@/components/landing/bento/ShareCard';
import TeamCard from '@/components/landing/bento/TeamCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Section des usages de l'accueil (design 3A) : cinq cartes, cinq moments de la vie d'un projet, qui
 * se manipulent pour de vrai. 01 cherche dans les annonces (API) ; 02 à 04 racontent lagos-transit,
 * le projet des maquettes ; 05 a le vrai réglage d'économie de données.
 *
 * Une lampe suit la souris sur toute la grille : chaque carte s'éclaire selon sa distance, ses bords
 * aussi, même celles d'à côté (styles/effects.css, « Usages »).
 */
export default function FeatureBento() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const grid = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function light(event: PointerEvent<HTMLDivElement>) {
    const element = grid.current;
    if (event.pointerType !== 'mouse' || !element) {
      return;
    }
    const { clientX, clientY } = event;
    element.dataset.lamp = '';
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      for (const card of element.querySelectorAll<HTMLElement>('[data-bento-card]')) {
        const box = card.getBoundingClientRect();
        card.style.setProperty('--lamp-x', `${clientX - box.left}px`);
        card.style.setProperty('--lamp-y', `${clientY - box.top}px`);
      }
    });
  }

  function dim() {
    cancelAnimationFrame(frame.current);
    delete grid.current?.dataset.lamp;
  }

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <section aria-labelledby="features-title" className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="max-w-3xl">
          <p className="eyebrow">{t('features.eyebrow')}</p>
          <h2 id="features-title" className="mt-3 font-display text-h2">
            {t('features.title')}
          </h2>
          <p className="mt-4 max-w-2xl text-lead text-muted-foreground">{t('features.text')}</p>
        </div>

        <div
          ref={grid}
          onPointerMove={light}
          onPointerLeave={dim}
          className="bento mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-6"
        >
          <MeetCard className="md:col-span-2 lg:col-span-4" />
          <ReviewCard className="lg:col-span-2" />
          <ShareCard className="lg:col-span-2" />
          <TeamCard className="md:col-span-2 lg:col-span-4" />
          <DailyCard className="md:col-span-2 lg:col-span-6" />
        </div>
      </section>
    </MotionConfig>
  );
}
