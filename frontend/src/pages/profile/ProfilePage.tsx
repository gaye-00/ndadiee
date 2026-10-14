import { Award, MapPin, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import QuestionCard from '@/components/question/QuestionCard';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import TagList from '@/components/shared/TagList';
import UserAvatar from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuestions } from '@/hooks/useQuestions';
import { useFollowUser, useUserProfile } from '@/hooks/useUsers';
import { EXPERIENCE_LEVEL_LABELS, ROLE_LABELS } from '@/utils/constants';
import { countryFlag, countryName, formatCount, formatDate } from '@/utils/formatters';

export default function ProfilePage() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const profile = useUserProfile(username);
  const questions = useQuestions({ author: username, size: 5 });
  const followUser = useFollowUser();

  if (profile.isPending) {
    return <ListSkeleton count={2} />;
  }
  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  const data = profile.data;
  const isOwnProfile = user?.id === data.id;
  const location = [data.city, countryName(data.country)].filter(Boolean).join(', ');

  const toggleFollow = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour suivre ce développeur');
      return;
    }
    followUser.mutate({ username: data.username, follow: !data.followedByMe });
  };

  const stats: Array<[string, number]> = [
    ['Réputation', data.reputation],
    ['Abonnés', data.followersCount],
    ['Abonnements', data.followingCount],
    ['Questions', data.questionCount],
    ['Réponses', data.answerCount],
    ['Articles', data.articleCount],
    ['Projets', data.projectCount],
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        <UserAvatar user={data} size="lg" className="size-16" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.fullName}</h1>
            {data.role !== 'USER' && <Badge variant="secondary">{ROLE_LABELS[data.role]}</Badge>}
            {data.openToWork && <Badge>Ouvert·e aux opportunités</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            @{data.username}
            {data.level && ` · ${EXPERIENCE_LEVEL_LABELS[data.level]}`}
            {` · Membre depuis le ${formatDate(data.createdAt)}`}
          </p>
          {location && (
            <p className="flex items-center gap-1.5 text-sm">
              <MapPin className="size-4 text-muted-foreground" /> {countryFlag(data.country)} {location}
            </p>
          )}
        </div>
        {!isOwnProfile && (
          <Button
            variant={data.followedByMe ? 'outline' : 'default'}
            onClick={toggleFollow}
            disabled={followUser.isPending}
          >
            {data.followedByMe ? (
              <>
                <UserCheck /> Suivi
              </>
            ) : (
              <>
                <UserPlus /> Suivre
              </>
            )}
          </Button>
        )}
      </header>

      {data.bio && <p className="max-w-2xl whitespace-pre-wrap">{data.bio}</p>}

      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3 text-center">
            <dd className="text-xl font-semibold tabular-nums">{formatCount(value)}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      {data.skills.length > 0 && (
        <section aria-labelledby="skills-title" className="space-y-2">
          <h2 id="skills-title" className="text-sm font-semibold">
            Compétences
          </h2>
          <TagList tags={data.skills} />
        </section>
      )}

      {data.badges.length > 0 && (
        <section aria-labelledby="badges-title" className="space-y-2">
          <h2 id="badges-title" className="text-sm font-semibold">
            Badges
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.badges.map(({ badge, awardedAt }) => (
              <li key={badge.id}>
                <Badge variant="outline" title={`${badge.description ?? ''} — obtenu le ${formatDate(awardedAt)}`}>
                  <Award /> {badge.name}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="questions-title" className="space-y-3">
        <h2 id="questions-title" className="text-sm font-semibold">
          Dernières questions
        </h2>
        {questions.isPending ? (
          <ListSkeleton count={2} />
        ) : questions.data && questions.data.content.length > 0 ? (
          questions.data.content.map((question) => <QuestionCard key={question.id} question={question} />)
        ) : (
          <p className="text-sm text-muted-foreground">Aucune question pour l'instant.</p>
        )}
      </section>
    </div>
  );
}
