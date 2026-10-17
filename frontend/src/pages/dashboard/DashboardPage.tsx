import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MatchingOpenings from '@/components/dashboard/MatchingOpenings';
import PendingReviews from '@/components/dashboard/PendingReviews';
import ReputationStats from '@/components/dashboard/ReputationStats';
import TeamActivityFeed from '@/components/dashboard/TeamActivityFeed';
import HackathonSpotlight from '@/components/hackathons/HackathonSpotlight';
import MyProjectsGrid from '@/components/projects/MyProjectsGrid';

/** Atelier : le tableau de bord du jour. Design 3B. */
export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <MyProjectsGrid />
      <PendingReviews />
      <MatchingOpenings />
      <aside>
        <TeamActivityFeed />
        <HackathonSpotlight />
        <ReputationStats />
      </aside>
    </>
  );
}
