import { Activity, ArrowRight, Ban, EyeOff, FolderKanban, MessageSquareText, MessagesSquare, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ActionList from '@/components/admin/ActionList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import KpiTile from '@/components/admin/KpiTile';
import SignupsChart from '@/components/admin/SignupsChart';
import ErrorState from '@/components/feedback/ErrorState';
import { useAdminOverview } from '@/hooks/useAdmin';
import { prefetch } from '@/lib/prefetch';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { AdminOverview } from '@/types/admin.types';
import { formatDay, formatNumber } from '@/utils/formatters';

/**
 * L'accueil du back-office : la communauté et ses contenus en chiffres (chacun mène à sa liste), les inscriptions
 * des 30 derniers jours, et les dernières décisions de l'équipe.
 */
export default function AdminOverviewPage() {
  const { t } = useTranslation('admin');
  const overview = useAdminOverview();
  // La date du jour, en tête de page (fixée à l'ouverture)
  const [today] = useState(() => new Date());

  return (
    <div className="relative isolate">
      {/* Lumières de fond : l'or derrière l'accueil */}
      <div aria-hidden className="halo halo-gold -top-72 -end-56 -z-10 size-[40rem] opacity-70" />

      <div className="mx-auto max-w-[82rem] px-4 pb-20 sm:px-6 lg:px-10">
        <AdminPageHeader eyebrow={formatDay(today)} title={t('shell.sections.overview')} lead={t('overview.lead')} />

        {overview.isPending && <OverviewSkeleton label={t('overview.loading')} />}
        {overview.isError && (
          <ErrorState title={t('overview.errorTitle')} description={t('shared.errorText')} onRetry={() => void overview.refetch()} />
        )}
        {overview.data && <OverviewContent data={overview.data} />}
      </div>
    </div>
  );
}

function OverviewContent({ data }: { data: AdminOverview }) {
  const { t } = useTranslation('admin');
  const thisWeek = (count: number) => t('overview.thisWeek', { formatted: formatNumber(count) });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="overview-community">
        <h2 id="overview-community" className="eyebrow mb-3">
          {t('overview.community')}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label={t('overview.kpi.members')} value={data.members} hint={thisWeek(data.newMembers)} icon={Users} tone="gold" to={paths.adminUsers} />
          <KpiTile label={t('overview.kpi.active')} value={data.activeMembers} hint={t('overview.kpi.activeHint')} icon={Activity} tone="jade" />
          <KpiTile
            label={t('overview.kpi.moderators')}
            value={data.moderators}
            hint={t('overview.kpi.moderatorsHint')}
            icon={ShieldCheck}
            to={`${paths.adminUsers}?role=MODERATOR`}
          />
          <KpiTile
            label={t('overview.kpi.blocked')}
            value={data.blockedMembers}
            hint={t('overview.kpi.blockedHint')}
            icon={Ban}
            tone="coral"
            to={`${paths.adminUsers}?status=BLOCKED`}
          />
        </div>
      </section>

      <section aria-labelledby="overview-content">
        <h2 id="overview-content" className="eyebrow mb-3">
          {t('overview.content')}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label={t('overview.kpi.topics')} value={data.topics} hint={thisWeek(data.newTopics)} icon={MessagesSquare} tone="gold" to={paths.adminContent} />
          <KpiTile
            label={t('overview.kpi.answers')}
            value={data.answers}
            hint={thisWeek(data.newAnswers)}
            icon={MessageSquareText}
            tone="jade"
            to={`${paths.adminContent}?type=ANSWER`}
          />
          <KpiTile
            label={t('overview.kpi.projects')}
            value={data.projects}
            hint={thisWeek(data.newProjects)}
            icon={FolderKanban}
            to={`${paths.adminContent}?type=PROJECT`}
          />
          <KpiTile
            label={t('overview.kpi.hidden')}
            value={data.hiddenContent}
            hint={t('overview.kpi.hiddenHint')}
            icon={EyeOff}
            tone="coral"
            to={`${paths.adminContent}?visibility=HIDDEN`}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SignupsChart data={data.signups} />

        <section aria-labelledby="overview-decisions" className="glass flex flex-col rounded-[1.375rem] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <h2 id="overview-decisions" className="font-display text-h5">
              {t('overview.recent.title')}
            </h2>
            <Link
              to={paths.adminJournal}
              viewTransition
              onPointerEnter={() => prefetch(pages.adminJournal)}
              onFocus={() => prefetch(pages.adminJournal)}
              className="group/all inline-flex shrink-0 items-center gap-1.5 rounded-full text-[0.8125rem] font-semibold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {t('overview.recent.seeAll')}
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/all:translate-x-0.5 rtl:-scale-x-100" />
            </Link>
          </div>
          {data.recentActions.length > 0 ? (
            <ActionList actions={data.recentActions} compact className="mt-2" />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('overview.recent.empty')}</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Même encombrement que la page, pendant le chargement. */
function OverviewSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-10">
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <span key={tile} className="h-[7.5rem] rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ))}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <span className="h-80 rounded-[1.375rem] skeleton-shimmer" />
        <span className="h-80 rounded-[1.375rem] skeleton-shimmer" />
      </div>
    </div>
  );
}
