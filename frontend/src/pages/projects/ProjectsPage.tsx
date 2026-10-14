import { FolderGit2 } from 'lucide-react';
import ProjectCard from '@/components/project/ProjectCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjects } from '@/hooks/useProjects';
import { useUrlFilters } from '@/hooks/useUrlFilters';

export default function ProjectsPage() {
  const { get, page, update } = useUrlFilters();
  const openOnly = get('open') === 'true';

  const projects = useProjects({ lookingForContributors: openOnly ? true : undefined, page, size: 12 });

  return (
    <>
      <PageHeader
        title="Projets open source"
        description="La vitrine des projets de la communauté. Certains cherchent des contributeurs."
        action={
          <Tabs
            value={openOnly ? 'open' : 'all'}
            onValueChange={(value) => update({ open: value === 'open' ? 'true' : null, page: null })}
          >
            <TabsList aria-label="Filtre des projets">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="open">Cherchent des contributeurs</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {projects.isPending ? (
        <ListSkeleton />
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : projects.data.content.length === 0 ? (
        <EmptyState icon={<FolderGit2 />} title="Aucun projet" description="Aucun projet ne correspond à ce filtre." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.data.content.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <Pagination page={projects.data} onPageChange={(next) => update({ page: String(next) })} />
        </div>
      )}
    </>
  );
}
