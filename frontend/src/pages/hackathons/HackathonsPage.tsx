import HackathonList from '@/components/hackathons/HackathonList';
import { WovenThreads } from '@/components/shared/WovenMotif';

/** Hackathons : à la une, à venir, et le palmarès des hackathons passés. */
export default function HackathonsPage() {
  return (
    <>
      {/* Dégradés des fils des motifs tissés (rôles recherchés par les équipes), une fois pour la page */}
      <WovenThreads />
      <HackathonList />
    </>
  );
}
