import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Highlight from './Highlight';
import SearchHitVisual from './SearchHitVisual';
import { hitKey, hitLink, hitSubtitle, hitTitle } from './searchHits';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ADMIN_APP_NAV, APP_NAV, CREATE_ACTIONS, PUBLIC_NAV } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { MIN_SEARCH_LENGTH, SEARCH_GROUPS, useSearchOverview } from '@/hooks/useSearch';
import { paths } from '@/router/paths';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';

// Résultats montrés par groupe ; les autres sur la page de recherche
const SHOWN = 3;

const includes = (label: string, text: string) => label.toLocaleLowerCase().includes(text.toLocaleLowerCase());

/**
 * Palette de recherche et d'actions, ouverte avec Ctrl K depuis n'importe quelle page. Design 3H.
 *
 * Sans rien écrire : ce qu'on peut créer, et les pages. En écrivant : les premiers rôles, projets, devs et sujets, et
 * d'abord la page de tous les résultats, qu'Entrée ouvre aussitôt. Les actions et les pages qui correspondent suivent.
 */
export default function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, isDeveloper } = useAuth();
  const [text, setText] = useState('');
  const query = useDebounce(text, 200).trim();
  const typed = text.trim();
  const searching = typed.length >= MIN_SEARCH_LENGTH;
  const overview = useSearchOverview(query, SHOWN, open && searching);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setText('');
    }
  }

  function go(to: string) {
    changeOpen(false);
    void navigate(to, { viewTransition: true });
  }

  const navigation = !isAuthenticated ? PUBLIC_NAV : isDeveloper ? APP_NAV : ADMIN_APP_NAV;
  const pages = navigation.filter((item) => includes(t(`nav.${item.labelKey}`), typed));
  const actions = isDeveloper ? CREATE_ACTIONS.filter((action) => includes(t(action.label), typed)) : [];
  const nothing = searching && !overview.isPending && !overview.isStale && overview.total === 0 && pages.length === 0 && actions.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={changeOpen} title={t('search.placeholder')} description={t('search.dialogDescription')} className="top-[12dvh] sm:max-w-xl">
      {/* CommandDialog de shadcn n'enveloppe pas son contenu : <Command> fournit l'état de la recherche. Le serveur a
          déjà trié les résultats : cmdk ne les filtre pas à nouveau */}
      <Command shouldFilter={false} className="**:data-[slot=input-group]:h-11!">
        {/* Les dégradés des fils des rôles trouvés : la palette s'ouvre aussi sur des pages qui n'en ont pas */}
        <WovenThreads />
        <CommandInput value={text} onValueChange={setText} placeholder={t('search.placeholder')} />
        <CommandList className="max-h-[min(30rem,64dvh)]">
          {searching && !nothing && (
            <CommandGroup>
              <CommandItem value="search-all" onSelect={() => go(paths.searchFor(typed))} className="gap-3 py-2 font-semibold [&>svg:last-child]:hidden">
                <Search aria-hidden className="size-4 text-gold" />
                <span className="min-w-0 flex-1 truncate">{t('search.seeAllFor', { query: typed })}</span>
                <ArrowRight aria-hidden className="size-4 text-muted-foreground rtl:-scale-x-100" />
              </CommandItem>
            </CommandGroup>
          )}

          {searching && overview.isPending && (
            <div className="grid h-24 place-items-center">
              <PulsatingDots label={t('states.loading')} />
            </div>
          )}

          {searching &&
            SEARCH_GROUPS.map((group) => {
              const { hits } = overview.groups[group];
              return (
                hits.length > 0 && (
                  <CommandGroup key={group} heading={t(`search.groups.${group}`)}>
                    {hits.map((hit) => (
                      <CommandItem key={hitKey(hit)} value={hitKey(hit)} onSelect={() => go(hitLink(hit))} className="gap-3 py-1.5">
                        <SearchHitVisual hit={hit} />
                        <span className="min-w-0 flex-1">
                          <span dir="auto" className="block truncate text-sm font-semibold text-foreground">
                            <Highlight text={hitTitle(hit)} query={query} />
                          </span>
                          <span dir="auto" className="block truncate text-xs text-muted-foreground">
                            <Highlight text={hitSubtitle(hit, t)} query={query} />
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              );
            })}

          {actions.length > 0 && (
            <CommandGroup heading={t('search.groups.actions')}>
              {actions.map((action) => (
                <CommandItem key={action.to} value={action.to} onSelect={() => go(action.to)} className="gap-3">
                  <action.icon aria-hidden className="size-4" />
                  {t(action.label)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {pages.length > 0 && (
            <CommandGroup heading={t('search.groups.pages')}>
              {pages.map((item) => (
                <CommandItem key={item.to} value={item.to} onSelect={() => go(item.to)} className="gap-3">
                  <item.icon aria-hidden className="size-4" />
                  {t(`nav.${item.labelKey}`)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {nothing && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('search.noResults', { query: typed })}</p>}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
