import OpeningFilters from '@/components/openings/OpeningFilters';
import OpeningList from '@/components/openings/OpeningList';

/** Annonces : rôles recherchés par les équipes. */
export default function OpeningsPage() {
  return (
    <>
      <OpeningFilters />
      <OpeningList />
    </>
  );
}
