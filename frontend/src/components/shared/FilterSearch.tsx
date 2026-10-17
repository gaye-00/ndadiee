import { useIsFetching, type QueryKey } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface FilterSearchProps {
  /** La recherche de l'URL */
  query: string;
  /** Une nouvelle recherche ; `replace` : elle en affine une autre, l'historique n'en garde qu'une */
  onSearch: (query: string, replace: boolean) => void;
  /** Requêtes des résultats : tant qu'elles chargent pour une recherche, des points remplacent la loupe */
  fetchingKey: QueryKey;
  /** Nom du champ, pour un lecteur d'écran (« Rechercher dans la vitrine ») */
  label: string;
  placeholder: string;
}

/**
 * La recherche d'une page à filtrer (vitrine, annonces). Elle part à la pause dans la frappe, ou tout de suite
 * avec Entrée ; « / » y amène depuis n'importe où dans la page, Échap l'efface. Au focus, un fil kente se tisse
 * sous le champ.
 */
export default function FilterSearch({ query, onSearch, fetchingKey, label, placeholder }: FilterSearchProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(query);
  const [shown, setShown] = useState(query);
  const typed = useDebounce(text, 350);
  // Des résultats arrivent pour cette recherche
  const searching = useIsFetching({ queryKey: fetchingKey }) > 0 && query !== '';

  // La recherche change ailleurs (Précédent, « Tout effacer ») : le champ suit
  if (query !== shown) {
    setShown(query);
    setText(query);
  }

  // Une nouvelle recherche, ou son abandon, ajoute une entrée à l'historique ; l'affiner la remplace
  function commit(next: string) {
    const trimmed = next.trim();
    if (trimmed !== query) {
      onSearch(trimmed, trimmed !== '' && query !== '');
    }
  }

  // À la pause dans la frappe, et seulement là : une recherche changée ailleurs (Précédent) n'est pas remplacée
  // par ce qui était tapé avant
  const commitTyped = useEffectEvent(commit);
  useEffect(() => {
    commitTyped(typed);
  }, [typed]);

  // « / » amène à la recherche, comme sur GitHub, sauf pendant une saisie
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
        return;
      }
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commit(text);
  }

  function clear() {
    setText('');
    commit('');
    input.current?.focus();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="filter-search relative flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3.5 transition-colors duration-300 focus-within:bg-surface/80"
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <span aria-hidden className="grid size-4 shrink-0 place-items-center text-muted-foreground">
        {searching ? <PulsatingDots size="sm" /> : <Search className="size-4" />}
      </span>
      <input
        id={inputId}
        ref={input}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && text !== '') {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        dir="auto"
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-[0.9375rem] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text !== '' ? (
        <button
          type="button"
          onClick={clear}
          aria-label={t('filters.clearSearch')}
          className={cn('grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground', focusRing)}
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : (
        <kbd
          title={t('filters.searchShortcut')}
          // Pour qui a un clavier : pas sur un écran tactile
          className="hidden h-6 min-w-6 shrink-0 place-items-center rounded-md border border-border bg-foreground/4 px-1.5 font-mono text-xs text-muted-foreground pointer-fine:md:grid"
        >
          /
        </kbd>
      )}
      {/* Au focus, un fil kente se tisse sous le champ */}
      <span aria-hidden className="filter-search-thread pointer-events-none absolute inset-x-4 bottom-0 h-px rounded-full" />
    </form>
  );
}
