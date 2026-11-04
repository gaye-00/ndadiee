import { Check, Pencil, SendHorizontal, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDraft } from '@/hooks/useDraft';
import { useEditMessage, useSendMessage } from '@/hooks/useMessages';
import { sendTyping } from '@/lib/chatSocket';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/types/message.types';

/** Longueur maximale d'un message (Message.MAX_LENGTH côté serveur) */
const MAX_LENGTH = 4000;
// Le compteur apparaît à l'approche de la limite
const COUNTER_FROM = 3500;
// Le champ grandit avec le texte jusqu'à cette hauteur, puis défile
const MAX_HEIGHT = 176;
// « En train d'écrire » : renouvelé au plus toutes les 3 s pendant la frappe, retiré après 4 s sans frappe
const TYPING_REFRESH = 3000;
const TYPING_IDLE = 4000;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Le signal « en train d'écrire » envoyé à l'autre membre, sans inonder le WebSocket. */
function useTypingSignal(conversationId: number) {
  const state = useRef<{ active: boolean; sentAt: number; idle?: ReturnType<typeof setTimeout> }>({ active: false, sentAt: 0 });

  const stop = useCallback(() => {
    clearTimeout(state.current.idle);
    if (state.current.active) {
      state.current.active = false;
      sendTyping(conversationId, false);
    }
  }, [conversationId]);

  const ping = useCallback(
    (hasText: boolean) => {
      if (!hasText) {
        stop();
        return;
      }
      const now = Date.now();
      if (!state.current.active || now - state.current.sentAt > TYPING_REFRESH) {
        sendTyping(conversationId, true);
        state.current.active = true;
        state.current.sentAt = now;
      }
      clearTimeout(state.current.idle);
      state.current.idle = setTimeout(stop, TYPING_IDLE);
    },
    [conversationId, stop],
  );

  // Quitter la conversation, c'est arrêter d'écrire
  useEffect(() => stop, [stop]);

  return { ping, stop };
}

interface MessageComposerProps {
  conversation: Conversation;
  /** Le message en cours de modification ; null pour un nouveau message */
  editing: Message | null;
  onCancelEdit: () => void;
  /** ↑ dans un champ vide : modifier son dernier message */
  onEditLast: () => void;
}

/**
 * Le champ d'écriture, au bas du fil.
 *
 * - Entrée envoie, Maj + Entrée va à la ligne (au doigt, Entrée va à la ligne : le bouton envoie). ↑ dans le champ vide
 *   modifie son dernier message ; Échap annule la modification.
 * - Le champ grandit avec le texte. Le brouillon de chaque conversation est gardé sur l'appareil.
 * - Pendant la frappe, l'autre membre voit « écrit… ».
 */
export default function MessageComposer({ conversation, editing, onCancelEdit, onEditLast }: MessageComposerProps) {
  const { t } = useTranslation('messages');
  const fieldId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { send } = useSendMessage(conversation.id);
  const edit = useEditMessage(conversation.id);
  const draft = useDraft<string>(`message-${conversation.id}`, '', (value) => value.trim() === '');
  // Le texte de la modification, repris du message chaque fois qu'on en modifie un autre
  const [edited, setEdited] = useState<{ id: number | null; text: string }>({ id: null, text: '' });
  if (editing && edited.id !== editing.id) {
    setEdited({ id: editing.id, text: editing.body ?? '' });
  } else if (!editing && edited.id !== null) {
    // Modification terminée ou abandonnée : la prochaine repartira du texte du message
    setEdited({ id: null, text: '' });
  }
  const editText = editing && edited.id === editing.id ? edited.text : (editing?.body ?? '');
  const typing = useTypingSignal(conversation.id);
  // Au doigt, le clavier n'a pas de Maj + Entrée : Entrée va à la ligne
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  const value = editing ? editText : draft.value;
  const trimmed = value.trim();
  const remaining = MAX_LENGTH - value.length;
  const canSubmit = trimmed !== '' && remaining >= 0 && !(editing && trimmed === editing.body);
  const firstName = conversation.participant?.fullName.split(/\s+/)[0] ?? '';

  // Une modification commence : le curseur au bout de son texte
  useEffect(() => {
    if (!editing) {
      return;
    }
    requestAnimationFrame(() => {
      const element = textarea.current;
      if (element) {
        element.focus();
        element.setSelectionRange(element.value.length, element.value.length);
      }
    });
  }, [editing]);

  // À l'ouverture, le champ prend le focus (pas au doigt : le clavier couvrirait le fil)
  useEffect(() => {
    if (!touch) {
      textarea.current?.focus();
    }
  }, [touch]);

  // Le champ grandit avec le texte
  useLayoutEffect(() => {
    const element = textarea.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
    }
  }, [value]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmit) {
      return;
    }
    if (editing) {
      edit.mutate({ message: editing, body: trimmed });
      onCancelEdit();
    } else {
      send(trimmed);
      draft.setValue('');
      draft.clear();
      typing.stop();
    }
    textarea.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !touch) {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape' && editing) {
      event.preventDefault();
      onCancelEdit();
    } else if (event.key === 'ArrowUp' && !editing && value === '') {
      event.preventDefault();
      onEditLast();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-border-subtle bg-background/85 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl saver:bg-background sm:px-6 md:bg-transparent md:backdrop-blur-none"
    >
      <div className="mx-auto max-w-3xl">
        <AnimatePresence initial={false}>
          {editing && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-gold/25 bg-gold/8 py-1.5 ps-3 pe-1.5 text-xs">
                <Pencil aria-hidden className="size-3.5 shrink-0 text-gold" />
                <span className="shrink-0 font-bold text-foreground">{t('composer.editing')}</span>
                <span dir="auto" className="min-w-0 flex-1 truncate text-muted-foreground">
                  {editing.body}
                </span>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  aria-label={t('composer.cancelEdit')}
                  className={cn('grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground', focusRing)}
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            'flex items-end gap-2 rounded-[1.5rem] border border-border bg-surface/90 py-1.5 ps-4 pe-1.5 shadow-[0_12px_32px_-24px_var(--float-shadow)] transition-[border-color,box-shadow] duration-200',
            'focus-within:border-border-strong focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--ring)_14%,transparent),0_12px_32px_-24px_var(--float-shadow)]',
            remaining < 0 && 'border-coral/60',
          )}
        >
          <label htmlFor={fieldId} className="sr-only">
            {t('composer.label')}
          </label>
          <textarea
            id={fieldId}
            ref={textarea}
            rows={1}
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              if (editing) {
                setEdited({ id: editing.id, text: next });
              } else {
                draft.setValue(next);
                typing.ping(next.trim() !== '');
              }
            }}
            onKeyDown={onKeyDown}
            onBlur={() => typing.stop()}
            placeholder={t('composer.placeholder', { name: firstName })}
            aria-invalid={remaining < 0 || undefined}
            dir="auto"
            enterKeyHint={touch ? 'enter' : 'send'}
            autoComplete="off"
            className="max-h-44 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-faint-foreground sm:text-[0.9375rem]"
          />
          {value.length >= COUNTER_FROM && (
            <span
              aria-live="polite"
              title={t('composer.remaining', { count: remaining })}
              className={cn('mb-3 shrink-0 font-mono text-[0.6875rem] tabular-nums', remaining < 0 ? 'font-bold text-coral' : 'text-faint-foreground')}
            >
              {remaining}
            </span>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label={editing ? t('composer.save') : t('composer.send')}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full bg-kente-warm text-kente-night shadow-[0_8px_20px_-10px_var(--kente-coral)]',
              'transition-[scale,opacity,box-shadow,filter] duration-200 ease-out-expo hover:brightness-105 active:scale-90',
              'disabled:bg-foreground/10 disabled:bg-none disabled:text-faint-foreground disabled:shadow-none',
              'focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface outline-none',
            )}
          >
            {editing ? (
              <Check aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <SendHorizontal aria-hidden className="size-[1.125rem] translate-x-px rtl:-translate-x-px rtl:-scale-x-100" strokeWidth={2.25} />
            )}
          </button>
        </div>

        <p className="mt-1.5 hidden px-3 text-[0.6875rem] text-faint-foreground pointer-fine:sm:block">
          <Trans
            t={t}
            i18nKey={editing ? 'composer.editHint' : 'composer.hint'}
            components={{ k: <kbd className="rounded border border-border bg-foreground/4 px-1 font-mono text-[0.625rem] text-muted-foreground" /> }}
          />
        </p>
      </div>
    </form>
  );
}
