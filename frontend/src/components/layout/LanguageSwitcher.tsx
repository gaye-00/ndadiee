import { Check, Languages } from 'lucide-react';
import { DropdownMenu as Menu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/useLanguage';
import type { LanguageCode } from '@/i18n/languages';
import { cn } from '@/lib/utils';

/**
 * Choix de la langue parmi celles de i18n/languages.ts (hooks/useLanguage) : chaque langue écrite dans
 * la sienne, son nom anglais dessous pour qui la cherche. Le choix est gardé pour les prochaines visites.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { language, languages, setLanguage } = useLanguage();

  return (
    <DropdownMenu dir={i18n.dir()}>
      <DropdownMenuTrigger
        aria-label={`${t('language.label')} : ${language.name}`}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 data-[state=open]:bg-foreground/6 data-[state=open]:text-foreground',
          className,
        )}
      >
        <Languages aria-hidden className="size-4" />
        <span className="font-mono text-xs uppercase">{language.code}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        <Menu.RadioGroup value={language.code} onValueChange={(code) => void setLanguage(code as LanguageCode)}>
          {languages.map((item) => (
            <Menu.RadioItem
              key={item.code}
              value={item.code}
              className="flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-start outline-none select-none focus:bg-accent data-[state=checked]:text-foreground"
            >
              <span className="min-w-0 flex-1">
                {/* Le nom dans son écriture, isolé : la ligne garde le sens du menu */}
                <span className="block text-sm font-semibold">
                  <bdi lang={item.code}>{item.name}</bdi>
                </span>
                <span className="block text-xs text-muted-foreground" lang="en" dir="ltr">
                  {item.englishName}
                </span>
              </span>
              <Menu.ItemIndicator>
                <Check aria-hidden className="size-4 text-gold" />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
