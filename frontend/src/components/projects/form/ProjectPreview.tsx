import { Eye, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenRolesList from '@/components/projects/OpenRolesList';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectGallery from '@/components/projects/ProjectGallery';
import ProjectHero from '@/components/projects/ProjectHero';
import type { Project } from '@/types/project.types';

/**
 * Le projet tel qu'il apparaîtra dans la vitrine, mis à jour à chaque frappe. La carte est la vraie (ProjectCard) :
 * inerte, elle ne mène nulle part et ne prend pas le focus.
 */
export function PreviewCard({ project }: { project: Project }) {
  const { t } = useTranslation('projectForm');

  return (
    <section aria-labelledby="preview-card-title" className="flex flex-col gap-2.5">
      <h2 id="preview-card-title" className="flex items-center gap-2 font-sans text-sm font-bold text-foreground">
        <LayoutGrid aria-hidden className="size-4 text-gold" />
        {t('preview.card')}
      </h2>
      <div inert aria-hidden className="pointer-events-none select-none">
        <ProjectCard project={project} accent="gold" imageSizes="22rem" />
      </div>
    </section>
  );
}

/**
 * La page du projet telle que les visiteurs la verront : son en-tête, sa galerie et ses rôles recherchés, avec les
 * vrais composants de la page. Inerte : rien ne s'y clique, rien n'y prend le focus.
 */
export function PreviewPage({ project }: { project: Project }) {
  const { t } = useTranslation('projectForm');

  return (
    <div className="relative isolate">
      <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
        <Eye aria-hidden className="size-3.5" />
        {t('preview.pageNotice')}
      </p>
      <div inert className="flex flex-col gap-10 select-none">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-10">
          <ProjectHero project={project} />
          <ProjectGallery project={project} />
        </section>
        {project.openings.length > 0 && <OpenRolesList project={project} />}
      </div>
    </div>
  );
}
