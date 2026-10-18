import { Award, BadgeCheck, Crown, Hammer, Lock, MessageCircleQuestionMark, MessageSquareReply, PenLine, Sparkles, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { KenteThread } from '@/config/roles';
import { useBadges } from '@/hooks/useBadges';
import { cn } from '@/lib/utils';
import type { Badge, BadgeType, UserProfile } from '@/types/user.types';
import { formatDate } from '@/utils/formatters';

/** Le dessin et la couleur de chaque badge du catalogue (BadgeType.java) */
const DESIGNS: Record<BadgeType, { icon: LucideIcon; thread: KenteThread }> = {
  FIRST_QUESTION: { icon: MessageCircleQuestionMark, thread: 'gold' },
  FIRST_ANSWER: { icon: MessageSquareReply, thread: 'jade' },
  FIRST_ACCEPTED_ANSWER: { icon: BadgeCheck, thread: 'jade' },
  FIRST_ARTICLE: { icon: PenLine, thread: 'coral' },
  FIRST_PROJECT: { icon: Hammer, thread: 'gold' },
  REPUTATION_100: { icon: Sparkles, thread: 'coral' },
  REPUTATION_500: { icon: Crown, thread: 'gold' },
};

/** Nom, description et condition d'un badge, dans la langue de l'interface ; ceux de la base pour un badge hors catalogue */
function useBadgeText() {
  const { t } = useTranslation('profile');
  return (badge: Badge) =>
    badge.type
      ? {
          name: t(`badges.catalog.${badge.type}.name`),
          description: t(`badges.catalog.${badge.type}.description`),
          criteria: t(`badges.catalog.${badge.type}.criteria`),
        }
      : { name: badge.name, description: badge.description ?? '', criteria: badge.criteria ?? '' };
}

/**
 * Badges obtenus. Design 3F. Chacun est une médaille tissée de sa couleur ; sur son propre profil, le membre voit
 * aussi ceux qui l'attendent, et comment les obtenir.
 */
export default function BadgesCard({ profile, own }: { profile: UserProfile; own: boolean }) {
  const { t } = useTranslation('profile');
  const catalog = useBadges();
  const earned = new Set(profile.badges.map(({ badge }) => badge.id));
  // Le catalogue ne sert qu'au membre lui-même : ce qu'il lui reste à obtenir
  const locked = own ? (catalog.data ?? []).filter((badge) => !earned.has(badge.id)) : [];

  return (
    <section aria-labelledby="badges-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="badges-title" className="eyebrow">
        {t('badges.title', { count: profile.badges.length })}
      </h2>

      {profile.badges.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{own ? t('badges.emptyOwn') : t('badges.empty')}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
          {profile.badges.map(({ badge, awardedAt }, index) => (
            <Medal key={badge.id} badge={badge} awardedAt={awardedAt} index={index} />
          ))}
        </ul>
      )}

      {locked.length > 0 && (
        <>
          <h3 className="eyebrow mt-6 border-t border-border-subtle pt-4">{t('badges.locked')}</h3>
          <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
            {locked.map((badge, index) => (
              <Medal key={badge.id} badge={badge} index={index} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Une médaille : obtenue (avec sa date), ou à obtenir (éteinte, avec sa condition) */
function Medal({ badge, awardedAt, index }: { badge: Badge; awardedAt?: string; index: number }) {
  const { t } = useTranslation('profile');
  const describe = useBadgeText();
  const text = describe(badge);
  const design = badge.type ? DESIGNS[badge.type] : { icon: Award, thread: 'gold' as const };
  const Icon = design.icon;
  const obtained = awardedAt !== undefined;
  const detail = obtained ? `${text.description} · ${t('badges.awarded', { date: formatDate(awardedAt) })}` : text.criteria;

  return (
    <m.li
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      title={detail}
      className="group/medal flex flex-col items-center gap-2 text-center"
    >
      <span
        aria-hidden
        style={{ '--badge': `var(--${design.thread}-graphic)` } as CSSProperties}
        className={cn(
          'relative grid size-12 place-items-center rounded-full transition-transform duration-500 ease-out-expo',
          obtained
            ? 'profile-badge text-kente-night group-hover/medal:-rotate-12 group-hover/medal:scale-110'
            : 'border border-dashed border-border-strong bg-foreground/4 text-faint-foreground',
        )}
      >
        <Icon className="size-5" />
        {!obtained && (
          <span className="absolute -end-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-surface text-faint-foreground ring-2 ring-surface">
            <Lock className="size-3" />
          </span>
        )}
      </span>
      <span className={cn('line-clamp-2 text-xs leading-tight font-semibold', obtained ? 'text-foreground' : 'text-muted-foreground')}>{text.name}</span>
      <span className="sr-only">{detail}</span>
    </m.li>
  );
}
