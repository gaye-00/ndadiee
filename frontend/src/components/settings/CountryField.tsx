import { Command } from 'cmdk';
import { Check, ChevronDown, Earth, Search, X } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsField, { settingsScrollMargins } from './SettingsField';
import { cn } from '@/lib/utils';
import { countryFlag, countryName } from '@/utils/formatters';

// Pays et territoires d'Afrique (géoschéma de l'ONU, M49), proposés en premier
const AFRICA =
  'DZ EG LY MA SD TN EH IO BI KM DJ ER ET TF KE MG MW MU YT MZ RE RW SC SO SS UG TZ ZM ZW AO CM CF TD CG CD GQ GA ST BW SZ LS NA ZA BJ BF CV CI GM GH GN GW LR ML MR NE NG SH SN SL TG'.split(
    ' ',
  );

// Le reste des codes ISO 3166-1, et le Kosovo (XK, que les navigateurs savent nommer)
const WORLD =
  'AD AE AF AG AI AL AM AQ AR AS AT AU AW AX AZ BA BB BD BE BG BH BL BM BN BO BQ BR BS BT BV BY BZ CA CC CH CK CL CN CO CR CU CW CX CY CZ DE DK DM DO EC EE ES FI FJ FK FM FO FR GB GD GE GF GG GI GL GP GR GS GT GU GY HK HM HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KG KH KI KN KP KR KW KY KZ LA LB LC LI LK LT LU LV MC MD ME MF MH MK MM MN MO MP MQ MS MT MV MX MY NC NF NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RO RS RU SA SB SE SG SI SJ SK SM SR SV SX SY TC TH TJ TK TL TM TO TR TT TV TW UA UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE'.split(
    ' ',
  );

// Les noms anglais se cherchent aussi : « ivory » trouve la Côte d'Ivoire
const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Recherche sans accents ni majuscules : « senegal » trouve « Sénégal »
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

function matches(_value: string, search: string, keywords?: string[]): number {
  const term = fold(search.trim());
  return keywords?.some((keyword) => fold(keyword).includes(term)) ? 1 : 0;
}

// Valeur de la ligne qui retire le pays : pas un code ISO
const NONE = '\u0000none';

const coarsePointer = window.matchMedia('(pointer: coarse)');

const itemClass = cn(
  'flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm text-soft-foreground outline-none select-none',
  'data-[selected=true]:bg-foreground/6 data-[selected=true]:text-foreground',
);

interface CountryFieldProps {
  /** Code ISO à 2 lettres, ou chaîne vide */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Le pays du profil : une liste qui se cherche au clavier, en français comme en anglais, chaque pays avec son
 * drapeau et son nom dans la langue de l'interface. Les pays d'Afrique viennent en premier.
 */
export default function CountryField({ value, onChange }: CountryFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  function choose(code: string) {
    setOpen(false);
    onChange(code);
  }

  return (
    <SettingsField label={t('settingsPage.country')}>
      {(control) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            {...control}
            className={cn(
              'group/country flex h-12 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-[0.875rem] px-4 text-start text-[0.9375rem] outline-none disabled:cursor-not-allowed',
              settingsScrollMargins,
            )}
          >
            {value ? (
              <span aria-hidden className="w-4 shrink-0 text-center text-base leading-none">
                {countryFlag(value)}
              </span>
            ) : (
              <Earth aria-hidden className="size-4 shrink-0 text-faint-foreground transition-colors duration-300 group-focus-within/field:text-gold" />
            )}
            <span dir="auto" className={cn('min-w-0 flex-1 truncate', !value && 'text-faint-foreground/80')}>
              {value ? countryName(value) : t('settingsPage.countryPlaceholder')}
            </span>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-faint-foreground transition-transform duration-300 ease-out-expo group-data-[state=open]/country:rotate-180"
            />
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={8}
              collisionPadding={12}
              // Sur un écran tactile, ouvrir la liste ne fait pas surgir le clavier : on choisit le plus souvent du doigt
              onOpenAutoFocus={(event) => {
                if (coarsePointer.matches) {
                  event.preventDefault();
                }
              }}
              className={cn(
                'facet-picker z-50 w-(--radix-popover-trigger-width) min-w-[min(17rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float outline-none',
                'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              )}
            >
              <CountryList value={value} onChoose={choose} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </SettingsField>
  );
}

/**
 * La liste qui se cherche, rendue seulement quand elle est ouverte : ses 250 pays ne pèsent pas sur chaque
 * frappe dans les autres champs du profil.
 */
function CountryList({ value, onChoose }: { value: string; onChoose: (code: string) => void }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  const groups = useMemo(() => {
    const collator = new Intl.Collator(language);
    const sorted = (codes: string[]) =>
      codes.map((code) => ({ code, name: countryName(code) })).sort((a, b) => collator.compare(a.name, b.name));
    return [
      { heading: t('settingsPage.countryAfrica'), items: sorted(AFRICA) },
      { heading: t('settingsPage.countryWorld'), items: sorted(WORLD) },
    ];
  }, [language, t]);

  return (
    <Command label={t('settingsPage.country')} filter={matches} defaultValue={value || undefined} loop>
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-3.5">
        <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <Command.Input
          placeholder={t('filters.countrySearch')}
          dir={i18n.dir()}
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-sm"
        />
      </div>
      <Command.List className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-4rem))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">{t('filters.noCountry')}</Command.Empty>
        {value && (
          <Command.Item value={NONE} keywords={[t('settingsPage.countryNone')]} onSelect={() => onChoose('')} className={itemClass}>
            <X aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{t('settingsPage.countryNone')}</span>
          </Command.Item>
        )}
        {groups.map(({ heading, items }) => (
          <Command.Group key={heading} heading={heading}>
            {items.map(({ code, name }) => (
              <Command.Item
                key={code}
                value={code}
                keywords={[name, englishNames.of(code) ?? code, code]}
                onSelect={() => onChoose(code)}
                className={cn(itemClass, code === value && 'font-semibold text-foreground')}
              >
                <span aria-hidden className="w-5 shrink-0 text-center text-base leading-none">
                  {countryFlag(code)}
                </span>
                <span dir="auto" className="min-w-0 flex-1 truncate text-start">
                  {name}
                </span>
                <Check aria-hidden className={cn('size-4 shrink-0 text-gold', code === value ? 'opacity-100' : 'opacity-0')} />
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );
}
