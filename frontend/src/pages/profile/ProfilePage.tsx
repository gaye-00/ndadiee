import BadgesCard from '@/components/profile/BadgesCard';
import BuilderStats from '@/components/profile/BuilderStats';
import CollaboratorsCard from '@/components/profile/CollaboratorsCard';
import ContributionHeatmap from '@/components/profile/ContributionHeatmap';
import ProfileCover from '@/components/profile/ProfileCover';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileShowcase from '@/components/profile/ProfileShowcase';

/** Profil développeur : des preuves de travail plutôt qu'un CV. Design 3F. */
export default function ProfilePage() {
  return (
    <>
      <ProfileCover />
      <ProfileHeader />
      <BuilderStats />
      <ProfileShowcase />
      <ContributionHeatmap />
      <aside>
        <CollaboratorsCard />
        <BadgesCard />
      </aside>
    </>
  );
}
