import { ChevronDown, ChevronRight, CircleCheck, FileDiff, Folder, FolderOpen, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { FILE_STATUSES } from '@/components/reviews/reviewVisuals';
import ViewedProgress from '@/components/reviews/ViewedProgress';
import { usePullRequestFiles, useReviewParams } from '@/hooks/usePullRequest';
import { useViewedFiles } from '@/hooks/useViewedFiles';
import { buildFileTree, fileAnchor, filesInTreeOrder, type FileTreeNode } from '@/lib/diff';
import { cn } from '@/lib/utils';
import type { PullRequestDetail, PullRequestFile } from '@/types/review.types';
import { formatCount } from '@/utils/formatters';
import { storage } from '@/utils/storage';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// L'arbre s'ouvre de lui-même sur un grand écran, où le diff garde assez de place à côté
const WIDE_SCREEN = '(min-width: 96rem)';

/**
 * L'arbre des fichiers modifiés d'une revue. Design 3C (« Fichiers modifiés »).
 *
 * Les dossiers, puis les fichiers, avec ce que la PR en fait, leurs commentaires et ceux qu'on a déjà vus ; un clic
 * mène au fichier dans le diff, et le fichier qu'on lit s'y éclaire. On y cherche un fichier par son chemin. Sur un
 * grand écran, l'arbre est une colonne qu'on replie ; sur tablette et téléphone, une liste qui se déplie au-dessus du
 * diff.
 */
export default function ChangedFilesTree({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { slug, number } = useReviewParams();
  const { data } = usePullRequestFiles(slug, number);
  const viewed = useViewedFiles(slug, number);
  const [open, setOpen] = useState(() => storage.getReviewTreeOpen() ?? window.matchMedia(WIDE_SCREEN).matches);
  const [expanded, setExpanded] = useState(false);

  const files = useMemo(() => filesInTreeOrder(buildFileTree(data?.files ?? [])), [data]);
  const active = useActiveFile(files);
  const comments = useMemo(() => {
    const counts = new Map<string, number>();
    detail.comments.forEach((comment) => {
      if (comment.path && comment.body !== null) {
        counts.set(comment.path, (counts.get(comment.path) ?? 0) + 1);
      }
    });
    return counts;
  }, [detail.comments]);

  // Pas de diff à parcourir (PR de démonstration sans diff, chargement, erreur) : le diff dit lui-même pourquoi
  if (!data?.available || files.length === 0) {
    return null;
  }

  const seen = viewed.countViewed(files);
  const toggle = (next: boolean) => {
    setOpen(next);
    storage.setReviewTreeOpen(next);
  };
  const body = (
    <TreeBody files={files} active={active} comments={comments} isViewed={viewed.isViewed} onNavigate={() => setExpanded(false)} />
  );

  return (
    <>
      {/* Tablette et téléphone : une liste qui se déplie au-dessus du diff */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cn('glass flex h-12 w-full items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold text-foreground', focusRing)}
        >
          <FileDiff aria-hidden className="size-4 text-soft-foreground" />
          {t('files.title')}
          <span className="font-mono text-xs font-normal text-muted-foreground">{t('files.viewed', { seen, total: files.length })}</span>
          <ChevronDown aria-hidden className={cn('ms-auto size-4 text-muted-foreground transition-transform duration-300', expanded && 'rotate-180')} />
        </button>
        {expanded && <div className="glass mt-2 flex max-h-[60dvh] flex-col rounded-2xl">{body}</div>}
      </div>

      {/* Grand écran : une colonne qui suit la lecture, qu'on replie pour donner toute la place au diff */}
      {open ? (
        <nav
          aria-label={t('files.title')}
          className="glass sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-64 shrink-0 flex-col rounded-[1.375rem] lg:flex"
        >
          <div className="flex items-center gap-2 px-4 pt-4">
            <h2 className="eyebrow">{t('files.title')}</h2>
            <span className="font-mono text-[0.6875rem] text-faint-foreground">{t('files.viewed', { seen, total: files.length })}</span>
            <button
              type="button"
              onClick={() => toggle(false)}
              aria-label={t('files.collapse')}
              title={t('files.collapse')}
              className={cn('ms-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
            >
              <PanelLeftClose aria-hidden className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
          <ViewedProgress seen={seen} total={files.length} className="mx-4 mt-2.5" />
          {body}
        </nav>
      ) : (
        <div className="sticky top-20 hidden shrink-0 lg:block">
          <button
            type="button"
            onClick={() => toggle(true)}
            aria-label={t('files.expand')}
            title={t('files.expand')}
            className={cn(
              'glass flex w-12 flex-col items-center gap-2 rounded-2xl py-3 text-muted-foreground transition-colors hover:text-foreground',
              focusRing,
            )}
          >
            <PanelLeftOpen aria-hidden className="size-4 rtl:-scale-x-100" />
            <span className="font-mono text-[0.625rem] tabular-nums [writing-mode:vertical-rl]">{t('files.viewed', { seen, total: files.length })}</span>
          </button>
        </div>
      )}
    </>
  );
}

interface TreeBodyProps {
  files: PullRequestFile[];
  active: string | null;
  comments: Map<string, number>;
  isViewed: (file: PullRequestFile) => boolean;
  /** Un fichier choisi : la liste dépliée du téléphone se replie */
  onNavigate: () => void;
}

/** La recherche, puis l'arbre ; chercher montre les fichiers qui correspondent, dossiers ouverts. */
function TreeBody({ files, active, comments, isViewed, onNavigate }: TreeBodyProps) {
  const { t } = useTranslation('reviews');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const tree = useMemo(
    () => buildFileTree(needle ? files.filter((file) => file.path.toLowerCase().includes(needle)) : files),
    [files, needle],
  );
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const jump = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    navigate({ search: location.search, hash: fileAnchor(path) }, { replace: true });
    onNavigate();
  };
  const toggleFolder = (path: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

  const renderNodes = (nodes: FileTreeNode[], depth: number) => (
    <ul className={cn(depth > 0 && 'ms-[0.95rem] border-s border-border-subtle ps-1')}>
      {nodes.map((node) => {
        if (node.kind === 'folder') {
          const isOpen = needle !== '' || !closed.has(node.path);
          const FolderIcon = isOpen ? FolderOpen : Folder;
          return (
            <li key={node.path}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleFolder(node.path)}
                title={node.path}
                className={cn(
                  'flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-start font-mono text-xs text-soft-foreground transition-colors hover:bg-foreground/5',
                  focusRing,
                )}
              >
                <ChevronRight aria-hidden className={cn('size-3.5 shrink-0 text-faint-foreground transition-transform duration-200 rtl:-scale-x-100', isOpen && 'rotate-90 rtl:-rotate-90')} />
                <FolderIcon aria-hidden className="size-3.5 shrink-0 text-faint-foreground" />
                <bdi dir="ltr" className="truncate">
                  {node.name}
                </bdi>
              </button>
              {isOpen && renderNodes(node.children, depth + 1)}
            </li>
          );
        }
        const { icon: Icon, tone } = FILE_STATUSES[node.file.status];
        const current = active === node.path;
        const count = comments.get(node.path) ?? 0;
        const done = isViewed(node.file);
        return (
          <li key={node.path}>
            <a
              href={`#${fileAnchor(node.path)}`}
              onClick={(event) => jump(event, node.path)}
              aria-current={current ? 'location' : undefined}
              title={node.path}
              className={cn(
                'group/file relative flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-1.5 font-mono text-xs transition-colors',
                current ? 'bg-foreground/7 font-semibold text-foreground' : 'text-soft-foreground hover:bg-foreground/5 hover:text-foreground',
                done && !current && 'text-muted-foreground',
                focusRing,
              )}
            >
              {current && <span aria-hidden className="absolute inset-y-1.5 -start-1 w-[3px] rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade" />}
              <Icon aria-hidden className={cn('size-3.5 shrink-0', tone)} />
              <span className="sr-only">{t(`files.status.${node.file.status}`)}</span>
              <bdi dir="ltr" className={cn('min-w-0 flex-1 truncate', done && 'line-through decoration-faint-foreground/60')}>
                {node.name}
              </bdi>
              {count > 0 && (
                <span title={t('item.comments', { count })} className="inline-flex shrink-0 items-center gap-0.5 text-[0.625rem] text-gold">
                  <MessageSquare aria-hidden className="size-3" />
                  {formatCount(count)}
                  <span className="sr-only">{t('item.comments', { count })}</span>
                </span>
              )}
              {done && <CircleCheck aria-label={t('files.viewedFile')} className="size-3.5 shrink-0 text-jade" />}
            </a>
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
          placeholder={t('files.filter')}
          aria-label={t('files.filter')}
          className={cn(
            'h-9 w-full rounded-xl border border-border bg-surface/60 ps-8 pe-8 font-mono text-xs text-foreground placeholder:text-faint-foreground [&::-webkit-search-cancel-button]:hidden',
            focusRing,
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('files.clearFilter')}
            className={cn('absolute end-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground', focusRing)}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        {tree.length > 0 ? (
          renderNodes(tree, 0)
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">{t('files.noMatch', { query: query.trim() })}</p>
        )}
      </div>
    </>
  );
}

/**
 * Le fichier qu'on lit dans le diff : le premier de ceux qui traversent la ligne de lecture, sous la barre du site et
 * l'en-tête collant du fichier.
 * Les fichiers du diff portent leur ancre (lib/diff.ts, fileAnchor).
 */
function useActiveFile(files: PullRequestFile[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      return undefined;
    }
    const visible = new Map<string, number>();
    const byId = new Map(files.map((file) => [fileAnchor(file.path), file.path]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const path = byId.get(entry.target.id);
          if (!path) {
            return;
          }
          if (entry.isIntersecting) {
            visible.set(path, entry.boundingClientRect.top);
          } else {
            visible.delete(path);
          }
        });
        // Le premier fichier de la lecture parmi ceux qui sont à l'écran
        const first = files.find((file) => visible.has(file.path));
        if (first) {
          setActive(first.path);
        }
      },
      // La ligne de lecture : sous la barre du site et l'en-tête collant du fichier, jusqu'au tiers de l'écran
      { rootMargin: '-128px 0px -66% 0px' },
    );
    // Le diff se dessine dans la même image que l'arbre : on attend qu'il soit là
    const frame = requestAnimationFrame(() => {
      byId.forEach((_, id) => {
        const element = document.getElementById(id);
        if (element) {
          observer.observe(element);
        }
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [files]);

  return active;
}
