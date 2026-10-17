import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectGrid from '@/components/projects/ProjectGrid';
import ShowcaseIntro from '@/components/projects/ShowcaseIntro';
import { WovenThreads } from '@/components/shared/WovenMotif';

/**
 * Vitrine : tous les projets, à filtrer par rôle recherché, stack et pays. L'accroche et la vitrine en
 * chiffres, les filtres, puis la grille, qui se déroule au fil du défilement. Les filtres sont dans l'URL :
 * /showcase?role=mobile&tag=flutter se partage.
 */
export default function ShowcasePage() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Dégradés des fils des motifs tissés (rôles recherchés), une fois pour la page */}
      <WovenThreads />
      {/* Lumières de fond : l'or derrière l'accroche, le vert derrière les rôles recherchés */}
      <div aria-hidden className="halo halo-gold -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[16rem] end-[-18rem] -z-10 size-[40rem] opacity-60" />

      <div className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32 xl:px-16">
        <ShowcaseIntro />
        <ProjectFilters />
        <ProjectGrid />
      </div>
    </div>
  );
}
