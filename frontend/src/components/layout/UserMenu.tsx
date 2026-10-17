import { Check, ChevronRight, FolderKanban, Languages, Leaf, LogOut, Moon, Settings, UserRound, type LucideIcon } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '@/components/shared/UserAvatar';
import { PUBLIC_NAV } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import type { LanguageCode } from '@/i18n/languages';
import { prefetch } from '@/lib/prefetch';
import { revealTheme } from '@/lib/themeReveal';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import { formatCount } from '@/utils/formatters';

const ITEM =
  'flex h-10 cursor-default items-center gap-3 rounded-xl ps-2.5 pe-2 text-sm font-medium text-soft-foreground outline-none select-none data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';
const SEPARATOR = 'mx-1 my-1.5 h-px bg-border-subtle';

interface UserMenuProps {
  /** Dans le rail (le menu s'ouvre sur le côté) ou dans la barre du haut du téléphone (il s'ouvre dessous) */
  placement: 'rail' | 'topbar';
  className?: string;
}

/**
 * Avatar à anneau kente du compte connecté et son menu : profil, projets, réglages, sections à explorer,
 * thème, économie de données, langue, déconnexion. L'anneau tourne au survol.
 */
export default function UserMenu({ placement, className }: UserMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, languages, setLanguage } = useLanguage();
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const setDataSaver = useDataSaverStore((s) => s.setEnabled);
  const trigger = useRef<HTMLButtonElement>(null);

  if (!user) {
    return null;
  }

  const rtl = language.dir === 'rtl';
  const dark = resolvedTheme === 'dark';
  const rail = placement === 'rail';

  function go(to: string, load?: () => Promise<unknown>) {
    if (load) {
      prefetch(load);
    }
    void navigate(to, { viewTransition: true });
  }

  // La nouvelle palette s'ouvre en cercle depuis l'avatar
  function toggleTheme() {
    const box = trigger.current?.getBoundingClientRect();
    revealTheme(dark ? 'light' : 'dark', box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: 0, y: 0 }, !reduced);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={t('a11y.account')}
          className={cn(
            'group/account relative grid shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            rail ? 'size-10' : 'size-9',
            className,
          )}
        >
          {/* L'anneau kente, qui tourne au survol */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-kente-conic transition-transform duration-[1.2s] ease-out-expo group-hover/account:rotate-180 group-data-[state=open]/account:rotate-180"
          />
          <UserAvatar user={user} size={rail ? 'md' : 'sm'} className={cn('relative ring-2 ring-background', rail ? 'size-9' : 'size-8')} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={rail ? (rtl ? 'left' : 'right') : 'bottom'}
          align={rail || rtl ? (rail ? 'end' : 'start') : 'end'}
          sideOffset={rail ? 18 : 10}
          collisionPadding={12}
          className={cn(
            'z-50 w-68 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none',
            'max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto',
            'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {/* Qui est connecté */}
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
            <span className="rounded-full bg-kente-conic p-0.5">
              <UserAvatar user={user} size="lg" className="ring-2 ring-popover" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.9375rem] font-bold text-foreground">
                <bdi>{user.fullName}</bdi>
              </span>
              <span dir="ltr" className="block truncate font-mono text-xs text-muted-foreground">
                @{user.username}
              </span>
              {user.reputation !== null && (
                <span className="mt-0.5 block text-xs font-semibold text-gold">
                  {t('shell.account.reputation', { count: user.reputation, formatted: formatCount(user.reputation) })}
                </span>
              )}
            </span>
          </div>
          <DropdownMenu.Separator className={SEPARATOR} />

          <MenuItem icon={UserRound} onSelect={() => go(paths.profile(user.username), pages.profile)}>
            {t('shell.account.profile')}
          </MenuItem>
          <MenuItem icon={FolderKanban} onSelect={() => go(paths.myProjects, pages.myProjects)}>
            {t('pages.myProjects')}
          </MenuItem>
          <MenuItem icon={Settings} onSelect={() => go(paths.settings, pages.settings)}>
            {t('nav.settings')}
          </MenuItem>

          <DropdownMenu.Separator className={SEPARATOR} />
          <DropdownMenu.Label className="eyebrow px-2.5 pt-1 pb-1.5">{t('shell.account.explore')}</DropdownMenu.Label>
          {PUBLIC_NAV.map((item) => (
            <MenuItem
              key={item.to}
              icon={item.icon}
              onSelect={() => go(item.to, item.preload)}
              // Le rail montre déjà les autres sections ; seule la vitrine n'y est pas
              className={item.to === paths.showcase ? undefined : 'md:hidden'}
            >
              {t(`nav.${item.labelKey}`)}
            </MenuItem>
          ))}

          <DropdownMenu.Separator className={SEPARATOR} />
          <DropdownMenu.CheckboxItem checked={dark} onCheckedChange={toggleTheme} className={ITEM}>
            <Moon aria-hidden />
            <span className="flex-1">{t('theme.darkTheme')}</span>
            <Switch on={dark} />
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={dataSaver}
            onCheckedChange={(checked) => setDataSaver(checked)}
            onSelect={(event) => event.preventDefault()}
            className={ITEM}
          >
            <Leaf aria-hidden />
            <span className="flex-1">{t('dataSaver.label')}</span>
            <Switch on={dataSaver} />
          </DropdownMenu.CheckboxItem>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={cn(ITEM, 'data-[state=open]:bg-foreground/6 data-[state=open]:text-foreground')}>
              <Languages aria-hidden />
              <span className="flex-1">{t('language.label')}</span>
              <bdi lang={language.code} className="text-xs text-muted-foreground">
                {language.name}
              </bdi>
              <ChevronRight aria-hidden className="text-faint-foreground rtl:-scale-x-100" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                collisionPadding={12}
                className="z-50 w-56 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
              >
                <DropdownMenu.RadioGroup value={language.code} onValueChange={(code) => void setLanguage(code as LanguageCode)}>
                  {languages.map((item) => (
                    <DropdownMenu.RadioItem
                      key={item.code}
                      value={item.code}
                      className="flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-start outline-none select-none data-[highlighted]:bg-foreground/6"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          <bdi lang={item.code}>{item.name}</bdi>
                        </span>
                        <span className="block text-xs text-muted-foreground" lang="en" dir="ltr">
                          {item.englishName}
                        </span>
                      </span>
                      <DropdownMenu.ItemIndicator>
                        <Check aria-hidden className="size-4 text-gold" />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator className={SEPARATOR} />
          <MenuItem
            icon={LogOut}
            onSelect={() => {
              logout();
              void navigate(paths.landing, { viewTransition: true });
            }}
            className="text-coral data-[highlighted]:bg-coral/10 data-[highlighted]:text-coral"
          >
            {t('actions.logout')}
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({ icon: Icon, onSelect, className, children }: { icon: LucideIcon; onSelect: () => void; className?: string; children: ReactNode }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={cn(ITEM, className)}>
      <Icon aria-hidden />
      <span className="flex-1 truncate">{children}</span>
    </DropdownMenu.Item>
  );
}

/** Petit interrupteur décoratif : l'état est porté par l'élément de menu (case cochée) */
function Switch({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cn('relative h-5 w-8.5 shrink-0 rounded-full transition-colors duration-300', on ? 'bg-jade' : 'bg-foreground/15')}>
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-300 ease-out-expo',
          on ? 'start-[calc(100%-1.125rem)]' : 'start-0.5',
        )}
      />
    </span>
  );
}
