import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MatchingOpenings from '@/components/dashboard/MatchingOpenings';
import PendingReviews from '@/components/dashboard/PendingReviews';
import ReputationStats from '@/components/dashboard/ReputationStats';
import TeamActivityFeed from '@/components/dashboard/TeamActivityFeed';
import HackathonSpotlight from '@/components/hackathons/HackathonSpotlight';
import MyProjectsGrid from '@/components/projects/MyProjectsGrid';
import { WovenThreads } from '@/components/shared/WovenMotif';

/**
 * Atelier : le tableau de bord du jour. Design 3B.
 *
 * Au centre, ses projets, les revues qui l'attendent et les annonces qui lui correspondent ; en marge, l'activité
 * de ses équipes, son prochain hackathon et sa réputation. Sur tablette et téléphone, la marge passe sous le reste.
 */
export default function DashboardPage() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Dégradés des fils des motifs tissés (rôles des annonces), une fois pour la page */}
      <WovenThreads />
      {/* Lumière dorée derrière la salutation, comme le design */}
      <div aria-hidden className="halo halo-gold -top-80 start-[8%] -z-10 size-[38rem] opacity-70" />

      <div className="mx-auto max-w-[90rem] px-4 pt-5 pb-16 sm:px-6 sm:pt-7 lg:px-8 lg:pb-20">
        <DashboardHeader />

        <div className="mt-7 grid gap-x-6 gap-y-8 xl:grid-cols-[minmax(0,1fr)_21.25rem]">
          <div className="flex min-w-0 flex-col gap-8">
            <MyProjectsGrid />
            <PendingReviews />
            <MatchingOpenings />
          </div>
          <aside className="flex min-w-0 flex-col gap-4">
            <TeamActivityFeed />
            <HackathonSpotlight />
            <ReputationStats />
          </aside>
        </div>
      </div>
    </div>
  );
}
