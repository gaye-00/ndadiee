import { Hash, Layers, Plus, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsField from './SettingsField';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import StackLogo from '@/components/shared/StackLogo';
import { tagLogoOf } from '@/config/stacks';
import { useDebounce } from '@/hooks/useDebounce';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTags } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { sameTag, tagSlug } from '@/utils/tags';

// Limites du backend (UpdateProfileRequest.java) : 15 compétences, 50 caractères chacune
const MAX_SKILLS = 15;
const MAX_SKILL = 50;
// Suggestions de la liste, et compétences populaires proposées sous le champ
const SUGGESTIONS = 8;
const POPULAR = 8;

interface Suggestion {
  name: string;
  description?: string | null;
  usage?: number;
  /** Le texte tapé, qui n'est pas encore un tag : il sera créé à l'enregistrement */
  created?: boolean;
}

interface SkillsFieldProps {
  value: string[];
  onChange: (skills: string[]) => void;
}

/**
 * Les compétences du profil (15 au plus) : elles font remonter les annonces, les rôles et les revues qui
 * correspondent au membre. On tape, les tags de la plateforme sont proposés avec leur logo et leur usage ; Entrée,
 * Tab ou la virgule ajoute, Retour arrière retire la dernière. Sous le champ, d'un clic : les plus utilisées.
 * Une liste déroulante accessible (combobox) : les flèches parcourent les suggestions, Échap les ferme.
 */
export default function SkillsField({ value, onChange }: SkillsFieldProps) {
  const { t } = useTranslation();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const logos = useStackLogos();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useDebounce(text.trim(), 200);
  const full = value.length >= MAX_SKILLS;
  const tags = useTags({ q: typed || undefined, size: SUGGESTIONS + value.length });
  const popular = useTags({ size: POPULAR + value.length, sort: 'usageCount,desc' });

  const fresh = text.trim();
  const startsWith = (name: string) => Number(name.toLowerCase().startsWith(fresh.toLowerCase()));
  // Les tags existants d'abord (ceux qui commencent par la saisie en tête : Entrée les choisit), créer vient en dernier.
  // Seuls ceux qui contiennent la saisie : tapé vite, Entrée ne prend pas une suggestion de la recherche d'avant
  const known: Suggestion[] = (tags.data?.content ?? [])
    .filter((tag) => tagSlug(tag.name).includes(tagSlug(fresh)))
    .filter((tag) => !value.some((chosen) => sameTag(chosen, tag.name)))
    .sort((a, b) => startsWith(b.name) - startsWith(a.name))
    .slice(0, SUGGESTIONS)
    .map((tag) => ({ name: tag.name, description: tag.description, usage: tag.usageCount }));
  const exists = known.some((tag) => sameTag(tag.name, fresh)) || value.some((chosen) => sameTag(chosen, fresh));
  const suggestions: Suggestion[] = fresh && !exists ? [...known, { name: fresh.slice(0, MAX_SKILL), created: true }] : known;
  const expanded = open && !full && fresh.length > 0 && suggestions.length > 0;
  const quick = (popular.data?.content ?? [])
    .map((tag) => tag.name)
    .filter((name) => !value.some((chosen) => sameTag(chosen, name)))
    .slice(0, POPULAR);

  function glyph(name: string, className = 'size-3.5'): ReactNode {
    const logo = tagLogoOf(tagSlug(name));
    if (logo && logos !== false) {
      return <StackLogo path={logos?.[logo]} className={className} />;
    }
    return <Hash aria-hidden className={cn(className, 'text-faint-foreground')} />;
  }

  function add(name: string) {
    const clean = name.replace(/,/g, ' ').trim().slice(0, MAX_SKILL);
    setText('');
    setActive(0);
    if (!clean || full || value.some((chosen) => sameTag(chosen, clean))) {
      return;
    }
    onChange([...value, clean]);
  }

  function addAll(names: string[]) {
    const next = [...value];
    names.forEach((name) => {
      const clean = name.trim().slice(0, MAX_SKILL);
      if (clean && next.length < MAX_SKILLS && !next.some((chosen) => sameTag(chosen, clean))) {
        next.push(clean);
      }
    });
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, position) => position !== index));
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!suggestions.length) {
          return;
        }
        event.preventDefault();
        setOpen(true);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + suggestions.length) % suggestions.length);
        return;
      }
      case 'Enter':
        // Entrée ajoute la compétence, sans envoyer le formulaire du profil
        if (fresh) {
          event.preventDefault();
          add(expanded && suggestions[active] ? suggestions[active].name : fresh);
        }
        return;
      case ',':
        event.preventDefault();
        add(fresh);
        return;
      case 'Tab':
        if (fresh) {
          add(expanded && suggestions[active] ? suggestions[active].name : fresh);
        }
        return;
      case 'Backspace':
        if (!text && value.length > 0) {
          event.preventDefault();
          onChange(value.slice(0, -1));
        }
        return;
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          setOpen(false);
        }
        return;
    }
  }

  return (
    <div id="skills" className="scroll-mt-36 lg:scroll-mt-24">
      <SettingsField
        label={t('settingsPage.skills')}
        icon={Layers}
        multiline
        hint={t('settingsPage.skillsHint')}
        aside={
          <span className={cn('font-mono text-xs tabular-nums transition-colors duration-300', full ? 'text-gold' : 'text-faint-foreground')}>
            {value.length}/{MAX_SKILLS}
          </span>
        }
      >
        {(control) => (
          <>
            <div onClick={() => input.current?.focus()} className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2.5 py-2">
              <ul aria-label={t('settingsPage.skillsChosen')} className="contents">
                <AnimatePresence initial={false}>
                  {value.map((skill, index) => (
                    <m.li
                      key={tagSlug(skill)}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-foreground/7 ps-2.5 pe-1 text-sm font-semibold text-foreground"
                    >
                      <span aria-hidden className="grid place-items-center text-soft-foreground">
                        {glyph(skill)}
                      </span>
                      <span dir="auto">{skill}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeAt(index);
                        }}
                        aria-label={t('settingsPage.skillsRemove', { tag: skill })}
                        className="grid size-6 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                      >
                        <X aria-hidden className="size-3.5" />
                      </button>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
              <input
                ref={input}
                {...control}
                role="combobox"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
                value={text}
                // Pleine, elle n'accepte plus de saisie sans s'éteindre : on peut toujours y revenir pour retirer
                readOnly={full}
                maxLength={MAX_SKILL}
                onChange={(event) => {
                  const next = event.target.value;
                  // Le clavier d'un téléphone n'envoie pas toujours la touche virgule : on la voit arriver dans le texte
                  if (next.includes(',')) {
                    add(next.split(',')[0]);
                    return;
                  }
                  setText(next);
                  setActive(0);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                onPaste={(event) => {
                  // Une liste collée (« React, Kotlin, PostgreSQL ») : une compétence par élément
                  const pasted = event.clipboardData.getData('text/plain');
                  if (pasted.includes(',')) {
                    event.preventDefault();
                    addAll(pasted.split(','));
                  }
                }}
                placeholder={
                  full
                    ? t('settingsPage.skillsFull', { count: MAX_SKILLS })
                    : value.length === 0
                      ? t('settingsPage.skillsPlaceholder')
                      : t('settingsPage.skillsMore')
                }
                autoComplete="off"
                spellCheck={false}
                className="h-8 min-w-40 flex-1 bg-transparent px-1.5 text-[0.9375rem] text-foreground outline-none placeholder:text-faint-foreground/80 disabled:cursor-not-allowed"
              />
              {tags.isFetching && expanded && <PulsatingDots size="sm" className="me-1" />}
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label={t('settingsPage.skillsSuggestions')}
              hidden={!expanded}
              className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-float"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.created ? `new-${suggestion.name}` : tagSlug(suggestion.name)}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Le champ garde le focus : la suggestion est ajoutée au clic, sans le perdre
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => add(suggestion.name)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors', index === active && 'bg-foreground/6')}
                >
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground/6 text-soft-foreground">
                    {suggestion.created ? <Plus className="size-4 text-gold" /> : glyph(suggestion.name, 'size-4')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block truncate text-sm font-semibold text-foreground">
                      {suggestion.created ? t('settingsPage.skillsCreate', { tag: suggestion.name }) : suggestion.name}
                    </span>
                    {suggestion.description && <span className="line-clamp-1 block text-xs text-muted-foreground">{suggestion.description}</span>}
                  </span>
                  {!suggestion.created && suggestion.usage !== undefined && suggestion.usage > 0 && (
                    <span className="shrink-0 font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{suggestion.usage}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </SettingsField>

      {!full && quick.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-xs text-muted-foreground">{t('settingsPage.skillsPopular')}</span>
          {quick.slice(0, MAX_SKILLS - value.length).map((name) => (
            <button
              key={tagSlug(name)}
              type="button"
              onClick={() => add(name)}
              aria-label={t('settingsPage.skillsAdd', { tag: name })}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-semibold text-soft-foreground outline-none transition-[background-color,border-color,color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:border-border-strong hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <Plus aria-hidden className="size-3 opacity-60" />
              {glyph(name, 'size-3')}
              <span dir="auto">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
