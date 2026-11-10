import { ChevronRight, File, FileCode2, FileCog, FileImage, FileJson, FileTerminal, FileText, Folder, FolderOpen, Search, X } from 'lucide-react';
import { useMemo, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { buildFileTree, type FileTreeNode } from '@/lib/diff';
import { cn } from '@/lib/utils';
import type { ProjectCodeEntry } from '@/types/code.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Un petit dépôt s'ouvre en entier ; un grand, seulement jusqu'au fichier ouvert
const OPEN_ALL_UP_TO = 40;
// Au-delà, chercher montre les premiers fichiers trouvés : l'arbre reste léger à dessiner
const MAX_MATCHES = 300;

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

// L'icône d'un fichier, d'après son nom
const ICONS: Array<[RegExp, IconComponent]> = [
  [/\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i, FileImage],
  [/\.(md|mdx|txt|rst|adoc)$|^(license|licence|copying|changelog|authors)(\.|$)/i, FileText],
  [/\.(json|jsonc|json5|conllu|csv|tsv)$/i, FileJson],
  [/\.(sh|bash|zsh|ps1|bat)$/i, FileTerminal],
  [/\.(ya?ml|toml|ini|cfg|conf|env|properties|lock|mod|sum|tf|tfvars|gradle)$|^(dockerfile|makefile|procfile)$|^\./i, FileCog],
  [/\.[a-z0-9]+$/i, FileCode2],
];

function iconOf(name: string): IconComponent {
  return ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? File;
}

// Les dossiers qui mènent à un fichier : « a/b/c.go » → a, a/b
function ancestorsOf(path: string | null): string[] {
  if (!path) {
    return [];
  }
  const parts = path.split('/');
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

interface CodeTreeProps {
  entries: ProjectCodeEntry[];
  selected: string | null;
  onSelect: (path: string) => void;
  /** Le dépôt a plus de fichiers que ceux listés */
  truncated: boolean;
}

/**
 * L'arbre des fichiers d'un dépôt : les dossiers d'abord, un clic ouvre un fichier, le fichier ouvert s'éclaire. Un
 * champ cherche un fichier par son chemin. Un petit dépôt s'affiche déplié ; un grand, replié jusqu'au fichier ouvert.
 */
export default function CodeTree({ entries, selected, onSelect, truncated }: CodeTreeProps) {
  const { t } = useTranslation('projectCode');
  const [query, setQuery] = useState('');
  const files = useMemo(() => entries.filter((entry) => entry.type === 'FILE'), [entries]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? files.filter((file) => file.path.toLowerCase().includes(needle)).slice(0, MAX_MATCHES) : files),
    [files, needle],
  );
  const tree = useMemo(() => buildFileTree(matches), [matches]);
  const [open, setOpen] = useState<ReadonlySet<string>>(() =>
    files.length <= OPEN_ALL_UP_TO
      ? new Set(entries.filter((entry) => entry.type === 'DIR').map((entry) => entry.path))
      : new Set(ancestorsOf(selected)),
  );

  // Un autre fichier ouvert (depuis l'arbre, le retour en arrière, un lien partagé) : ses dossiers s'ouvrent, dès ce rendu
  const [openedFor, setOpenedFor] = useState(selected);
  if (openedFor !== selected) {
    setOpenedFor(selected);
    const ancestors = ancestorsOf(selected);
    if (!ancestors.every((path) => open.has(path))) {
      setOpen(new Set([...open, ...ancestors]));
    }
  }

  // Un dossier fusionné (« internal/schedule ») est ouvert quand son chemin complet l'est
  const isOpen = (path: string) => needle !== '' || open.has(path);
  const toggle = (path: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        // Un dossier fusionné ouvre aussi ceux qu'il regroupe
        ancestorsOf(`${path}/x`).forEach((ancestor) => next.add(ancestor));
      }
      return next;
    });

  const renderNodes = (nodes: FileTreeNode<ProjectCodeEntry>[], depth: number) => (
    <ul className={cn(depth > 0 && 'ms-[0.95rem] border-s border-border-subtle ps-1')}>
      {nodes.map((node) => {
        if (node.kind === 'folder') {
          const expanded = isOpen(node.path);
          const FolderIcon = expanded ? FolderOpen : Folder;
          return (
            <li key={node.path}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle(node.path)}
                title={node.path}
                className={cn(
                  'flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-start font-mono text-xs text-soft-foreground transition-colors hover:bg-foreground/5',
                  focusRing,
                )}
              >
                <ChevronRight
                  aria-hidden
                  className={cn('size-3.5 shrink-0 text-faint-foreground transition-transform duration-200 rtl:-scale-x-100', expanded && 'rotate-90 rtl:-rotate-90')}
                />
                <FolderIcon aria-hidden className="size-3.5 shrink-0 text-gold/80" />
                <bdi dir="ltr" className="truncate">
                  {node.name}
                </bdi>
              </button>
              {expanded && renderNodes(node.children, depth + 1)}
            </li>
          );
        }
        const current = selected === node.path;
        const Icon = iconOf(node.name);
        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              aria-current={current ? 'page' : undefined}
              title={node.path}
              className={cn(
                'relative flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-start font-mono text-xs transition-colors',
                current ? 'bg-foreground/7 font-semibold text-foreground' : 'text-soft-foreground hover:bg-foreground/5 hover:text-foreground',
                focusRing,
              )}
            >
              {current && <span aria-hidden className="absolute inset-y-1.5 -start-1 w-[3px] rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade" />}
              <Icon aria-hidden className={cn('size-3.5 shrink-0', current ? 'text-gold' : 'text-faint-foreground')} />
              <bdi dir="ltr" className="min-w-0 flex-1 truncate">
                {node.name}
              </bdi>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="relative mx-3 mt-3">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('code.filter')}
          aria-label={t('code.filter')}
          className={cn(
            'h-9 w-full rounded-xl border border-border bg-surface/60 ps-8 pe-8 font-mono text-xs text-foreground placeholder:text-faint-foreground [&::-webkit-search-cancel-button]:hidden',
            focusRing,
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('code.clearFilter')}
            className={cn('absolute end-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground', focusRing)}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      <nav aria-label={t('code.filesTitle')} className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        {tree.length > 0 ? (
          renderNodes(tree, 0)
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            {needle ? t('code.noMatch', { query: query.trim() }) : t('code.empty')}
          </p>
        )}
        {truncated && !needle && <p className="mx-1.5 mt-3 rounded-lg bg-gold/8 px-2.5 py-2 text-[0.6875rem] leading-relaxed text-gold">{t('code.truncated')}</p>}
      </nav>
    </>
  );
}
