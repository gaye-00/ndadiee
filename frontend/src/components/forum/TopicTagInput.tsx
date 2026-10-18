import { Plus, X } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { tagAccent } from './forumUtils';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useDebounce } from '@/hooks/useDebounce';
import { useTags } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { MAX_QUESTION_TAGS } from '@/utils/validators';

// Longueur d'un tag (QuestionRequest.java)
const MAX_TAG = 50;
// Suggestions montrées
const SUGGESTIONS = 8;

/** Deux saisies qui désignent le même tag (« Spring Boot », « spring-boot ») : comparées sans casse ni séparateurs */
const sameTag = (a: string, b: string) => a.toLowerCase().replace(/[\s_-]+/g, '') === b.toLowerCase().replace(/[\s_-]+/g, '');

interface TopicTagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  onFocus?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

interface Suggestion {
  name: string;
  slug?: string;
  description?: string | null;
  /** Le texte tapé, qui n'est pas encore un tag : il sera créé à la publication */
  created?: boolean;
}

/**
 * Les tags d'un sujet, comme dans l'éditeur de dev.to : on tape, des tags existants sont proposés (avec leur
 * description), Entrée, Tab ou la virgule ajoute le tag, Retour arrière retire le dernier. Un tag qui n'existe pas
 * encore est créé à la publication. Cinq au plus. Une liste déroulante accessible (combobox) : les flèches
 * parcourent les suggestions, Échap les ferme.
 */
export default function TopicTagInput({ id, value, onChange, onFocus, invalid = false, describedBy }: TopicTagInputProps) {
  const { t } = useTranslation('forum');
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useDebounce(text.trim(), 200);
  const full = value.length >= MAX_QUESTION_TAGS;
  const tags = useTags({ q: typed || undefined, size: SUGGESTIONS + value.length });

  const fresh = text.trim();
  const startsWith = (name: string) => Number(name.toLowerCase().startsWith(fresh.toLowerCase()));
  // Les tags existants d'abord (ceux qui commencent par la saisie en tête : Entrée les choisit) ; créer un tag vient
  // en dernier, la virgule ajoute aussi la saisie telle quelle
  const known: Suggestion[] = (tags.data?.content ?? [])
    .filter((tag) => !value.some((chosen) => sameTag(chosen, tag.name)))
    .sort((a, b) => startsWith(b.name) - startsWith(a.name))
    .slice(0, SUGGESTIONS)
    .map((tag) => ({ name: tag.name, slug: tag.slug, description: tag.description }));
  const exists = known.some((tag) => sameTag(tag.name, fresh)) || value.some((chosen) => sameTag(chosen, fresh));
  const suggestions: Suggestion[] = fresh && !exists ? [...known, { name: fresh.slice(0, MAX_TAG), created: true }] : known;
  const expanded = open && !full && suggestions.length > 0;

  function add(name: string) {
    const clean = name.replace(/,/g, ' ').trim().slice(0, MAX_TAG);
    if (!clean || full || value.some((chosen) => sameTag(chosen, clean))) {
      setText('');
      return;
    }
    onChange([...value, clean]);
    setText('');
    setActive(0);
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
        if (fresh || (expanded && suggestions[active])) {
          event.preventDefault();
          add(expanded && suggestions[active] ? suggestions[active].name : fresh);
        }
        return;
      case ',':
        // La virgule sépare les tags : ce qui est tapé devient un tag, tel quel
        event.preventDefault();
        if (fresh) {
          add(fresh);
        }
        return;
      case 'Tab':
        // Tab ajoute ce qui est tapé, puis le focus continue normalement
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
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
    }
  }

  return (
    <div className="relative">
      <div
        onClick={() => input.current?.focus()}
        className={cn(
          'flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border bg-surface px-2.5 py-2 transition-[border-color,box-shadow] duration-200',
          invalid ? 'border-coral/60' : 'border-border focus-within:border-gold/55',
          'focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
        )}
      >
        <ul aria-label={t('form.tagsChosen')} className="contents">
          {value.map((tag, index) => (
            <li key={tag} style={tagAccent(tag.toLowerCase())} className="inline-flex h-8 items-center gap-1 rounded-xl bg-[color-mix(in_srgb,var(--tag-accent)_11%,transparent)] ps-2.5 pe-1 text-sm font-semibold text-foreground">
              <span aria-hidden className="font-mono text-(--tag-accent)">
                #
              </span>
              {tag}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAt(index);
                }}
                aria-label={t('form.removeTag', { tag })}
                className="grid size-6 place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
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
          maxLength={MAX_TAG}
          onChange={(event) => {
            const typedText = event.target.value;
            // Le clavier d'un téléphone n'envoie pas toujours la touche virgule : on la voit arriver dans le texte
            if (typedText.includes(',')) {
              add(typedText.split(',')[0]);
              return;
            }
            setText(typedText);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            onFocus?.();
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            // Une liste collée (« react, typescript, performance ») : un tag par élément
            const pasted = event.clipboardData.getData('text/plain');
            if (pasted.includes(',')) {
              event.preventDefault();
              const names = pasted.split(',').map((name) => name.trim()).filter(Boolean);
              const next = [...value];
              names.forEach((name) => {
                if (next.length < MAX_QUESTION_TAGS && !next.some((chosen) => sameTag(chosen, name))) {
                  next.push(name.slice(0, MAX_TAG));
                }
              });
              onChange(next);
            }
          }}
          placeholder={full ? t('form.tagsFull', { count: MAX_QUESTION_TAGS }) : value.length === 0 ? t('form.tagsPlaceholder', { count: MAX_QUESTION_TAGS }) : t('form.tagsMore')}
          autoComplete="off"
          spellCheck={false}
          className="h-8 min-w-40 flex-1 bg-transparent px-1.5 text-[0.9375rem] text-foreground outline-none placeholder:text-faint-foreground disabled:cursor-not-allowed"
        />
        {tags.isFetching && open && <PulsatingDots size="sm" className="me-1" />}
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t('form.tagSuggestions')}
        hidden={!expanded}
        className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-float"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.created ? `new-${suggestion.name}` : suggestion.slug}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            // Le champ garde le focus : la suggestion est ajoutée au clic, sans le perdre
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => add(suggestion.name)}
            style={tagAccent(suggestion.slug ?? suggestion.name.toLowerCase())}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 transition-colors',
              index === active ? 'bg-foreground/6' : '',
            )}
          >
            {suggestion.created ? (
              <Plus aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
            ) : (
              <span aria-hidden className="mt-px w-4 shrink-0 text-center font-mono font-bold text-(--tag-accent)">
                #
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {suggestion.created ? t('form.createTag', { tag: suggestion.name }) : suggestion.name}
              </span>
              {suggestion.description && <span className="line-clamp-1 block text-xs text-muted-foreground">{suggestion.description}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
