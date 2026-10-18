import { CheckCheck, Rocket, Trophy, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatTile from '@/components/shared/StatTile';
import type { UserProfile } from '@/types/user.types';

/**
 * Preuves de travail : projets lancés, équipes rejointes, réponses acceptées, hackathons disputés. Que des faits
 * vérifiables sur la plateforme, et seulement ce que le public peut voir. Design 3F.
 */
export default function BuilderStats({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');

  return (
    <section aria-labelledby="builder-stats-title">
      <h2 id="builder-stats-title" className="sr-only">
        {t('stats.title')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Rocket} tone="gold" index={0} value={profile.projectCount} label={t('stats.projects', { count: profile.projectCount })} />
        <StatTile icon={UsersRound} tone="jade" index={1} value={profile.teamCount} label={t('stats.teams', { count: profile.teamCount })} />
        <StatTile
          icon={CheckCheck}
          tone="coral"
          index={2}
          value={profile.acceptedAnswerCount}
          label={t('stats.acceptedAnswers', { count: profile.acceptedAnswerCount })}
          detail={profile.answerCount > 0 ? t('stats.ofAnswers', { count: profile.answerCount }) : undefined}
        />
        <StatTile
          icon={Trophy}
          tone="gold"
          index={3}
          value={profile.hackathonCount}
          label={t('stats.hackathons', { count: profile.hackathonCount })}
          detail={profile.podiumCount > 0 ? t('stats.podiums', { count: profile.podiumCount }) : undefined}
        />
      </div>
    </section>
  );
}
