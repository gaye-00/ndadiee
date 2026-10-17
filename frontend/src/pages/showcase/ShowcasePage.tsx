import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectGrid from '@/components/projects/ProjectGrid';

/** Vitrine : tous les projets, à filtrer par rôle recherché et par stack. */
export default function ShowcasePage() {
  return (
    <>
      <ProjectFilters />
      <ProjectGrid />
    </>
  );
}
