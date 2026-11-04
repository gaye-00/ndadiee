import { Hash, Plus, Sparkles, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LIMITS } from './projectDraft';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import StackLogo from '@/components/shared/StackLogo';
import { tagLogoOf } from '@/config/stacks';
import { useDebounce } from '@/hooks/useDebounce';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTags } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { sameTag, tagSlug } from '@/utils/tags';

// Suggestions de la liste, et technologies populaires proposées sous un champ vide
const SUGGESTIONS = 8;
const POPULAR = 10;

interface Suggestion {
  name: string;
  description?: string | null;
  usage?: number;
  /** Le texte tapé, qui n'est pas encore un tag : il sera créé à la publication */
  created?: boolean;
}

interface StackInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Technologies proposées par le dépôt importé (langages, sujets) */
  suggested?: string[];
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Les technologies du projet (8 au plus) : on tape, les tags de la plateforme sont proposés avec leur logo et leur
 * nombre de projets, Entrée, Tab ou la virgule ajoute, Retour arrière retire le dernier. Sous le champ, d'un clic :
 * les technologies du dépôt importé, ou les plus utilisées de la plateforme. Une liste déroulante accessible
 * (combobox) : les flèches parcourent les suggestions, Échap les ferme.
 */
export default function StackInput({ id, value, onChange, suggested = [], invalid = false, describedBy }: StackInputProps) {
  const { t } = useTranslation('projectForm');
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const logos = useStackLogos();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useDebounce(text.trim(), 200);
  const full = value.length >= LIMITS.tags;
  const tags = useTags({ q: typed || undefined, size: SUGGESTIONS + value.length });
  const popular = useTags({ size: POPULAR + value.length, sort: 'usageCount,desc' });

  const fresh = text.trim();
  const startsWith = (name: string) => Number(name.toLowerCase().startsWith(fresh.toLowerCase()));
  const known: Suggestion[] = (tags.data?.content ?? [])
    .filter((tag) => !value.some((chosen) => sameTag(chosen, tag.name)))
    .sort((a, b) => startsWith(b.name) - startsWith(a.name))
    .slice(0, SUGGESTIONS)
    .map((tag) => ({ name: tag.name, description: tag.description, usage: tag.usageCount }));
  const exists = known.some((tag) => sameTag(tag.name, fresh)) || value.some((chosen) => sameTag(chosen, fresh));
  const suggestions: Suggestion[] = fresh && !exists ? [...known, { name: fresh.slice(0, LIMITS.tag), created: true }] : known;
  const expanded = open && !full && fresh.length > 0 && suggestions.length > 0;

  // Sous le champ : le dépôt importé d'abord, sinon ce que la plateforme utilise le plus
  const fromRepository = suggested.filter((name) => !value.some((chosen) => sameTag(chosen, name)));
  const quick = fromRepository.length
    ? fromRepository
    : (popular.data?.content ?? []).map((tag) => tag.name).filter((name) => !value.some((chosen) => sameTag(chosen, name))).slice(0, POPULAR);

  function glyph(name: string, className = 'size-3.5'): ReactNode {
    const logo = tagLogoOf(tagSlug(name));
    if (logo && logos !== false) {
      return <StackLogo path={logos?.[logo]} className={className} />;
    }
    return <Hash aria-hidden className={cn(className, 'text-faint-foreground')} />;
  }

  function add(name: string) {
    const clean = name.replace(/,/g, ' ').trim().slice(0, LIMITS.tag);
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
      const clean = name.trim().slice(0, LIMITS.tag);
      if (clean && next.length < LIMITS.tags && !next.some((chosen) => sameTag(chosen, clean))) {
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
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          onClick={() => input.current?.focus()}
          className={cn(
            'flex min-h-12 flex-wrap items-center gap-1.5 rounded-[0.875rem] border bg-surface/60 px-2 py-2 transition-[border-color,box-shadow,background-color] duration-200',
            invalid ? 'border-coral/60' : 'border-border hover:border-border-strong focus-within:border-gold/60',
            'focus-within:bg-surface focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_14%,transparent)]',
          )}
        >
          <ul aria-label={t('stack.chosen')} className="contents">
            <AnimatePresence initial={false}>
              {value.map((tag, index) => (
                <m.li
                  key={tagSlug(tag)}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-foreground/7 ps-2.5 pe-1 text-sm font-semibold text-foreground"
                >
                  <span aria-hidden className="grid place-items-center text-soft-foreground">
                    {glyph(tag)}
                  </span>
                  <span dir="auto">{tag}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeAt(index);
                    }}
                    aria-label={t('stack.remove', { tag })}
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
            id={id}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            value={text}
            disabled={full}
            maxLength={LIMITS.tag}
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
              // Une liste collée (« React, Kotlin, PostgreSQL ») : un tag par élément
              const pasted = event.clipboardData.getData('text/plain');
              if (pasted.includes(',')) {
                event.preventDefault();
                addAll(pasted.split(','));
              }
            }}
            placeholder={full ? t('stack.full', { count: LIMITS.tags }) : value.length === 0 ? t('stack.placeholder') : t('stack.more')}
            autoComplete="off"
            spellCheck={false}
            className="h-8 min-w-40 flex-1 bg-transparent px-1.5 text-[0.9375rem] text-foreground outline-none placeholder:text-faint-foreground/80 disabled:cursor-not-allowed"
          />
          {tags.isFetching && expanded && <PulsatingDots size="sm" className="me-1" />}
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label={t('stack.suggestions')}
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
                  {suggestion.created ? t('stack.create', { tag: suggestion.name }) : suggestion.name}
                </span>
                {suggestion.description && <span className="line-clamp-1 block text-xs text-muted-foreground">{suggestion.description}</span>}
              </span>
              {!suggestion.created && suggestion.usage !== undefined && suggestion.usage > 0 && (
                <span className="shrink-0 font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{suggestion.usage}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!full && quick.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {fromRepository.length > 0 && <Sparkles aria-hidden className="size-3.5 text-gold" />}
            {t(fromRepository.length > 0 ? 'stack.fromRepository' : 'stack.popular')}
          </span>
          {quick.slice(0, LIMITS.tags - value.length + 4).map((name) => (
            <button
              key={tagSlug(name)}
              type="button"
              onClick={() => add(name)}
              aria-label={t('stack.add', { tag: name })}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70',
                fromRepository.length > 0
                  ? 'border-gold/30 bg-gold/8 text-foreground hover:bg-gold/14'
                  : 'border-border text-soft-foreground hover:border-border-strong hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              <Plus aria-hidden className="size-3 opacity-60" />
              {glyph(name, 'size-3')}
              <span dir="auto">{name}</span>
            </button>
          ))}
          {fromRepository.length > 1 && (
            <button
              type="button"
              onClick={() => addAll(fromRepository)}
              className="h-7 rounded-full px-2.5 text-xs font-bold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {t('stack.addAll')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
