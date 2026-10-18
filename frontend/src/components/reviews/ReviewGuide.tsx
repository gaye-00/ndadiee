import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Les trois gestes d'une bonne revue, chacun sur un fil du kente
const STEPS = [
  { key: 'read', dot: 'bg-kente-gold text-kente-night' },
  { key: 'suggest', dot: 'bg-kente-coral text-white' },
  { key: 'decide', dot: 'bg-kente-jade text-kente-night' },
] as const;

/**
 * « Bien relire » : lire la description et l'issue d'abord, proposer une suggestion plutôt qu'un reproche, rendre
 * un verdict clair. La culture de revue de la communauté, en trois lignes.
 */
export default function ReviewGuide({ className }: { className?: string }) {
  const { t } = useTranslation('reviews');
  return (
    <section aria-labelledby="review-guide-title" className={cn('glass rounded-[1.375rem] p-5', className)}>
      <h2 id="review-guide-title" className="eyebrow">
        {t('guide.title')}
      </h2>
      <ol className="mt-3 flex flex-col gap-3">
        {STEPS.map(({ key, dot }, index) => (
          <li key={key} className="flex gap-3">
            <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.625rem] font-bold', dot)}>
              {index + 1}
            </span>
            <span className="text-[0.8125rem] leading-relaxed text-soft-foreground">
              <span className="font-bold text-foreground">{t(`guide.${key}Title`)}</span> {t(`guide.${key}Text`)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
