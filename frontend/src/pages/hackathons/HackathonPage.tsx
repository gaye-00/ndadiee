import HackathonHeader from '@/components/hackathons/HackathonHeader';
import HackathonTeams from '@/components/hackathons/HackathonTeams';

/** Un hackathon : présentation, inscription et équipes. */
export default function HackathonPage() {
  return (
    <>
      <HackathonHeader />
      <HackathonTeams />
    </>
  );
}
