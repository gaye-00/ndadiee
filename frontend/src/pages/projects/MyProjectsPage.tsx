import MyProjectsGrid from '@/components/projects/MyProjectsGrid';

/** Mes projets : ceux dont le membre fait partie, dans les mêmes marges que l'atelier. */
export default function MyProjectsPage() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 pt-5 pb-16 sm:px-6 sm:pt-7 lg:px-8 lg:pb-20">
      <MyProjectsGrid />
    </div>
  );
}
