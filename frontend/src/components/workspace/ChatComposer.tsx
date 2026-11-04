import { CalendarPlus, SendHorizontal } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { columnOf } from './board';
import EventDialog from './EventDialog';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, threadStyle } from './workspaceStyles';
import UserAvatar from '@/components/shared/UserAvatar';
import { useSendMessage, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/apiError';

// Longueur d'un message (TeamMessageRequest.java) ; le compte s'affiche à l'approche
const MAX_LENGTH = 2000;
const COUNT_FROM = 1800;
// Le champ grandit avec le texte, jusqu'à six lignes environ
const MAX_HEIGHT = 168;
const SUGGESTIONS = 6;

// Recherche sans accents ni majuscules
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Le mot qu'on est en train d'écrire, s'il appelle une suggestion : « #3 » (une tâche) ou « @am » (quelqu'un) */
interface Token {
  trigger: '#' | '@';
  query: string;
  /** Où il commence dans le texte */
  start: number;
}

function tokenAt(text: string, caret: number): Token | null {
  const match = /(^|\s)([#@])([\p{L}\p{N}_-]{0,30})$/u.exec(text.slice(0, caret));
  if (!match) {
    return null;
  }
  return { trigger: match[2] as Token['trigger'], query: match[3], start: caret - match[3].length - 1 };
}

interface Suggestion {
  key: string;
  /** Ce qui remplace le mot : « #38 », « @ama_owusu » */
  insert: string;
  icon: ReactNode;
  label: string;
  detail: string;
}

/**
 * Champ de saisie de la discussion (« #33 » pour lier une tâche). Design 3E.
 *
 * Entrée envoie, Maj+Entrée va à la ligne ; le champ grandit avec le texte. « # » propose les tâches du tableau, « @ »
 * l'équipe : les flèches choisissent, Entrée ou Tab insère, Échap referme. Le message part tout de suite (il s'affiche
 * en route) ; refusé, son texte revient dans le champ. Le calendrier propose un rendez-vous à l'équipe.
 */
export default function ChatComposer() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const tasks = useWorkspaceTasks(slug);
  const send = useSendMessage(slug);
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const nextCaret = useRef<number | null>(null);
  const ids = { list: useId(), hint: useId() };

  const token = tokenAt(text, caret);
  const tokenKey = token ? `${token.start}:${token.trigger}${token.query}` : null;
  const suggestions = token && tokenKey !== dismissed ? suggest(token) : [];
  const open = suggestions.length > 0;
  const selected = open ? Math.min(active, suggestions.length - 1) : -1;

  // Le champ suit la hauteur du texte ; une suggestion insérée y replace le curseur
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) {
      return;
    }
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
    if (nextCaret.current !== null) {
      element.setSelectionRange(nextCaret.current, nextCaret.current);
      nextCaret.current = null;
    }
  }, [text]);

  function suggest(current: Token): Suggestion[] {
    const query = fold(current.query);
    if (current.trigger === '#') {
      return (tasks.data ?? [])
        .filter((task) => String(task.number).startsWith(query) || fold(task.title).includes(query))
        .sort((a, b) => Number(String(b.number).startsWith(query)) - Number(String(a.number).startsWith(query)) || b.number - a.number)
        .slice(0, SUGGESTIONS)
        .map((task) => ({
          key: `task-${task.number}`,
          insert: `#${task.number}`,
          icon: <span style={threadStyle(columnOf(task.status).thread)} className="size-2 rounded-full bg-(--thread)" />,
          label: `#${task.number}`,
          detail: task.title,
        }));
    }
    // Les noms qui commencent par ce qu'on tape d'abord (« @am » : Ama avant Kwame)
    const starts = (member: (typeof workspace.members)[number]) =>
      fold(member.user.username).startsWith(query) || fold(member.user.fullName).split(/\s+/).some((part) => part.startsWith(query));
    return workspace.members
      .filter((member) => fold(member.user.username).includes(query) || fold(member.user.fullName).includes(query))
      .sort((a, b) => Number(starts(b)) - Number(starts(a)))
      .slice(0, SUGGESTIONS)
      .map((member) => ({
        key: `member-${member.user.id}`,
        insert: `@${member.user.username}`,
        icon: <UserAvatar user={member.user} size="sm" className="size-5 text-[0.5rem]" />,
        label: member.user.fullName,
        detail: `@${member.user.username}`,
      }));
  }

  function insert(suggestion: Suggestion) {
    if (!token) {
      return;
    }
    const after = text.slice(caret);
    const spaced = `${suggestion.insert}${after.startsWith(' ') ? '' : ' '}`;
    const next = text.slice(0, token.start) + spaced + after;
    nextCaret.current = token.start + spaced.length;
    setText(next);
    setCaret(nextCaret.current);
    setActive(0);
    field.current?.focus();
  }

  function submit() {
    const body = text.trim();
    if (!body || body.length > MAX_LENGTH) {
      return;
    }
    setText('');
    setCaret(0);
    send.mutate(body, {
      onError: (error) => {
        // Le message n'est pas parti : son texte revient, rien n'est perdu
        setText((current) => (current.trim() ? current : body));
        toast.error(getApiErrorMessage(error));
      },
    });
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((selected + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        insert(suggestions[selected]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(tokenKey);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="relative shrink-0 border-t border-border-subtle p-3 sm:px-4">
      <AnimatePresence>
        {open && (
          <m.ul
            id={ids.list}
            role="listbox"
            aria-label={token?.trigger === '#' ? t('composer.tasks') : t('composer.people')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease }}
            className="absolute inset-x-3 bottom-full z-20 mb-1.5 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-float sm:inset-x-4"
          >
            <li aria-hidden className="eyebrow px-2.5 pt-1 pb-1.5">
              {token?.trigger === '#' ? t('composer.tasks') : t('composer.people')}
            </li>
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.key}
                id={`${ids.list}-${index}`}
                role="option"
                aria-selected={index === selected}
                onPointerDown={(event) => {
                  // Le champ garde le focus
                  event.preventDefault();
                  insert(suggestion);
                }}
                onPointerEnter={() => setActive(index)}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm',
                  index === selected ? 'bg-foreground/7 text-foreground' : 'text-soft-foreground',
                )}
              >
                <span aria-hidden className="grid size-5 shrink-0 place-items-center">
                  {suggestion.icon}
                </span>
                <span className="shrink-0 font-semibold">{suggestion.label}</span>
                <span dir="auto" className="min-w-0 flex-1 truncate text-start text-xs text-muted-foreground">
                  {suggestion.detail}
                </span>
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-surface p-1.5 transition-[border-color,box-shadow] duration-300 focus-within:border-gold/55 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]">
        <button
          type="button"
          onClick={() => setPlanning(true)}
          aria-label={t('composer.event')}
          title={t('composer.event')}
          className={cn('grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold', focusRing)}
        >
          <CalendarPlus aria-hidden className="size-4.5" />
        </button>
        <textarea
          ref={field}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            setText(event.target.value);
            setCaret(event.target.selectionStart);
            setActive(0);
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={keys}
          dir="auto"
          aria-label={t('composer.label')}
          aria-describedby={ids.hint}
          aria-autocomplete="list"
          aria-controls={open ? ids.list : undefined}
          aria-activedescendant={open ? `${ids.list}-${selected}` : undefined}
          placeholder={t('composer.placeholder')}
          className="max-h-42 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-base leading-snug outline-none placeholder:text-faint-foreground sm:text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label={t('composer.send')}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl bg-kente-warm text-kente-night transition-[opacity,translate] duration-200 hover:-translate-y-px disabled:translate-y-0 disabled:bg-foreground/8 disabled:text-faint-foreground',
            focusRing,
          )}
        >
          <SendHorizontal aria-hidden className="size-4 rtl:-scale-x-100" />
        </button>
      </div>
      <p id={ids.hint} className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[0.6875rem] text-faint-foreground">
        <span className="pointer-coarse:hidden">{t('composer.hint')}</span>
        {text.length >= COUNT_FROM && (
          <span className={cn('ms-auto font-mono tabular-nums', text.length >= MAX_LENGTH && 'text-coral')}>
            {text.length} / {MAX_LENGTH}
          </span>
        )}
      </p>
      <EventDialog open={planning} onOpenChange={setPlanning} />
    </div>
  );
}
