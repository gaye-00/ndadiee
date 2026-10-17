import GithubRepoImport from '@/components/projects/GithubRepoImport';
import ProjectForm from '@/components/projects/ProjectForm';

/** Publier un projet : import depuis GitHub, ou saisie. */
export default function NewProjectPage() {
  return (
    <>
      <GithubRepoImport />
      <ProjectForm />
    </>
  );
}
