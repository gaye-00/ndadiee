import { NotebookPen } from 'lucide-react';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWorkspaceContext } from './workspaceContext';
import { fieldClass, primaryButton } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useAddDevlogEntry } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

// Longueurs de DevlogEntryRequest.java
const MAX_BODY = 1000;
const MAX_VERSION = 30;

/**
 * Noter un progrès dans le devlog, depuis l'espace de l'équipe : une ou deux phrases (`code` et @mentions compris), et
 * la version quand c'est une release. L'entrée arrive en tête du journal, sur la page publique du projet aussi.
 */
export default function DevlogComposer() {
  const { t } = useTranslation('workspace');
  const { workspace } = useWorkspaceContext();
  const addEntry = useAddDevlogEntry(workspace.project.id);
  const [body, setBody] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ids = { body: useId(), version: useId() };

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!body.trim() || addEntry.isPending) {
      return;
    }
    setError(null);
    addEntry.mutate(
      { body: body.trim(), version: version.trim() || undefined },
      {
        onSuccess: () => {
          setBody('');
          setVersion('');
          toast.success(t('devlog.published'));
        },
        onError: (failure) => {
          const fields = getApiError(failure)?.validationErrors;
          setError(fields?.body ?? fields?.version ?? getApiErrorMessage(failure));
        },
      },
    );
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="devlog-composer-title" className="glass rounded-2xl p-4 sm:p-5">
      <h2 id="devlog-composer-title" className="flex items-center gap-2 text-sm font-bold">
        <NotebookPen aria-hidden className="size-4 text-gold" />
        {t('devlog.title')}
      </h2>
      <label htmlFor={ids.body} className="sr-only">
        {t('devlog.bodyLabel')}
      </label>
      <textarea
        id={ids.body}
        rows={3}
        value={body}
        maxLength={MAX_BODY}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={keys}
        dir="auto"
        placeholder={t('devlog.placeholder')}
        aria-invalid={error ? true : undefined}
        className={cn(fieldClass, 'mt-3 resize-none py-3 leading-relaxed')}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-coral">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <label htmlFor={ids.version} className="sr-only">
          {t('devlog.versionLabel')}
        </label>
        <input
          id={ids.version}
          value={version}
          maxLength={MAX_VERSION}
          onChange={(event) => setVersion(event.target.value)}
          dir="ltr"
          placeholder={t('devlog.versionPlaceholder')}
          className={cn(fieldClass, 'h-10 w-40 font-mono text-sm')}
        />
        <span className="text-xs text-faint-foreground">{t('devlog.hint')}</span>
        <span className="flex-1" />
        <span aria-hidden className="font-mono text-[0.6875rem] text-faint-foreground tabular-nums">
          {body.length} / {MAX_BODY}
        </span>
        <button type="submit" disabled={!body.trim()} aria-busy={addEntry.isPending || undefined} className={primaryButton}>
          {addEntry.isPending && <PulsatingDots size="sm" tone="current" />}
          {t('devlog.publish')}
        </button>
      </div>
    </form>
  );
}
