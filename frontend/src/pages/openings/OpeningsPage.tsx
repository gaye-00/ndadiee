import OpeningFilters from '@/components/openings/OpeningFilters';
import OpeningList from '@/components/openings/OpeningList';
import OpeningsIntro from '@/components/openings/OpeningsIntro';
import { WovenThreads } from '@/components/shared/WovenMotif';

/**
 * Annonces : les rôles que cherchent les équipes, à filtrer par rôle, stack et pays. L'accroche et les annonces en
 * chiffres, les filtres, puis la liste, qui se déroule au fil du défilement. Les filtres sont dans l'URL :
 * /openings?role=mobile&tag=flutter se partage.
 */
export default function OpeningsPage() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Dégradés des fils des motifs tissés (rôles), une fois pour la page */}
      <WovenThreads />
      {/* Lumières de fond : le vert derrière l'accroche (on recrute), l'or derrière les rôles */}
      <div aria-hidden className="halo halo-jade -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-gold top-[16rem] end-[-18rem] -z-10 size-[40rem] opacity-60" />

      <div className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32 xl:px-16">
        <OpeningsIntro />
        <OpeningFilters />
        <OpeningList />
      </div>
    </div>
  );
}
