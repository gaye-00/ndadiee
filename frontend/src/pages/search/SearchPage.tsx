import { useState, type FormEvent } from 'react';
import { SearchX } from 'lucide-react';
import ArticleCard from '@/components/article/ArticleCard';
import ProjectCard from '@/components/project/ProjectCard';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import UserCard from '@/components/shared/UserCard';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { MIN_SEARCH_LENGTH, useSearch } from '@/hooks/useSearch';
import { useUrlFilters } from '@/hooks/useUrlFilters';

export default function SearchPage() {
  const { get } = useUrlFilters();
  const urlQuery = get('q') ?? '';

  // key : une recherche lancée d'ailleurs (palette Ctrl+K) repart d'un champ à jour
  return <SearchResults key={urlQuery} initialQuery={urlQuery} />;
}

interface SearchResultsProps {
  initialQuery: string;
}

function SearchResults({ initialQuery }: SearchResultsProps) {
  const { update } = useUrlFilters();
  const [input, setInput] = useState(initialQuery);
  // La recherche ne part qu'une fois la frappe terminée, pas à chaque touche
  const query = useDebounce(input.trim(), 350);

  // Entrée : la recherche passe dans l'URL, pour pouvoir la partager ou y revenir
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    update({ q: input.trim() || null });
  };

  const search = useSearch(query);
  const results = search.data;
  const total =
    (results?.questions?.totalElements ?? 0) +
    (results?.articles?.totalElements ?? 0) +
    (results?.projects?.totalElements ?? 0) +
    (results?.users?.totalElements ?? 0);

  return (
    <>
      <PageHeader title="Recherche" />
      <form onSubmit={onSubmit} role="search" className="mb-6">
        <Input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Rechercher des questions, articles, projets, développeurs…"
          aria-label="Rechercher"
          autoFocus
        />
      </form>

      {query.length < MIN_SEARCH_LENGTH ? (
        <p className="text-sm text-muted-foreground">Saisissez au moins {MIN_SEARCH_LENGTH} caractères.</p>
      ) : search.isPending ? (
        <ListSkeleton />
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => void search.refetch()} />
      ) : total === 0 ? (
        <EmptyState icon={<SearchX />} title="Aucun résultat" description={`Rien ne correspond à « ${query} ».`} />
      ) : (
        <div className="space-y-8">
          {results?.questions && results.questions.content.length > 0 && (
            <section className="space-y-3" aria-labelledby="search-questions">
              <h2 id="search-questions" className="text-sm font-semibold">
                Questions ({results.questions.totalElements})
              </h2>
              {results.questions.content.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))}
            </section>
          )}
          {results?.articles && results.articles.content.length > 0 && (
            <section className="space-y-3" aria-labelledby="search-articles">
              <h2 id="search-articles" className="text-sm font-semibold">
                Articles ({results.articles.totalElements})
              </h2>
              {results.articles.content.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </section>
          )}
          {results?.projects && results.projects.content.length > 0 && (
            <section className="space-y-3" aria-labelledby="search-projects">
              <h2 id="search-projects" className="text-sm font-semibold">
                Projets ({results.projects.totalElements})
              </h2>
              {results.projects.content.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </section>
          )}
          {results?.users && results.users.content.length > 0 && (
            <section className="space-y-3" aria-labelledby="search-users">
              <h2 id="search-users" className="text-sm font-semibold">
                Développeurs ({results.users.totalElements})
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {results.users.content.map((user) => (
                  <li key={user.id} className="rounded-lg border p-3">
                    <UserCard user={user} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
