import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  type LucideIcon,
} from 'lucide-react';
import { Popover } from 'radix-ui';
import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import MarkdownContent from './MarkdownContent';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/imageUpload';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Mise en forme proposée par la barre d'outils */
type Format = 'bold' | 'italic' | 'link' | 'heading' | 'quote' | 'code' | 'codeBlock' | 'list' | 'orderedList';
export type MarkdownFormat = Format;

interface Tool {
  format: Format;
  icon: LucideIcon;
  /** Raccourci : Ctrl (⌘ sur Mac) + cette touche */
  key?: string;
}

const TOOLS: readonly Tool[] = [
  { format: 'bold', icon: Bold, key: 'b' },
  { format: 'italic', icon: Italic, key: 'i' },
  { format: 'link', icon: Link2, key: 'k' },
  { format: 'heading', icon: Heading2 },
  { format: 'quote', icon: Quote },
  { format: 'code', icon: Code, key: 'e' },
  { format: 'codeBlock', icon: SquareCode },
  { format: 'list', icon: List },
  { format: 'orderedList', icon: ListOrdered },
];

// Préfixe de ligne de chaque format « de ligne » ; une liste numérotée compte ses lignes
const LINE_PREFIXES: Partial<Record<Format, (index: number) => string>> = {
  heading: () => '## ',
  quote: () => '> ',
  list: () => '- ',
  orderedList: (index) => `${index + 1}. `,
};

// Une ligne de liste : son retrait, sa puce ou son numéro, son texte
const LIST_ITEM = /^(\s*)([-*+]|(\d+)\.)\s(\[[ xX]\]\s)?(.*)$/;

// Images envoyées d'un coup (un glisser-déposer de tout un dossier ne part pas en entier)
const MAX_IMAGES_AT_ONCE = 6;

// Chaque envoi a son repère dans le texte, le temps d'arriver
let uploadSequence = 0;

/** Les fichiers d'image d'un collage ou d'un dépôt */
const imagesOf = (files: FileList | null | undefined) =>
  Array.from(files ?? []).filter((file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type));

/**
 * Remplace la sélection par `text` comme le ferait la frappe : l'historique du navigateur la garde (Ctrl+Z annule
 * la mise en forme), et React reçoit le changement. Puis sélectionne [selectStart, selectEnd] dans le nouveau texte.
 */
function insert(area: HTMLTextAreaElement, start: number, end: number, text: string, selectStart: number, selectEnd: number) {
  area.focus();
  area.setSelectionRange(start, end);
  // execCommand : seul moyen de passer par l'historique d'annulation du champ. Sans lui, on écrit directement
  if (!document.execCommand('insertText', false, text)) {
    area.setRangeText(text, start, end, 'end');
    area.dispatchEvent(new Event('input', { bubbles: true }));
  }
  area.setSelectionRange(selectStart, selectEnd);
}

export interface MarkdownEditorHandle {
  focus: () => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Nom du champ pour un lecteur d'écran, quand aucun libellé visible n'est relié (`id`) */
  label?: string;
  id?: string;
  placeholder?: string;
  /** Hauteur de départ, en lignes ; le champ grandit ensuite avec le texte */
  minRows?: number;
  /** Longueur maximale (le compteur s'affiche à l'approche) */
  maxLength?: number;
  /** Ctrl (⌘) + Entrée : publier */
  onSubmit?: () => void;
  /** Échap : abandonner (réponse en ligne, modification) */
  onCancel?: () => void;
  onFocus?: () => void;
  invalid?: boolean;
  /** Aide ou erreur reliée au champ */
  describedBy?: string;
  autoFocus?: boolean;
  /** compact : sans barre d'outils, pour un commentaire */
  variant?: 'full' | 'compact';
  /** Au bas de l'éditeur, à côté du compteur (« Ctrl + Entrée pour publier ») */
  hint?: ReactNode;
  /**
   * Envoie une image et rend son adresse (hooks/useImageUpload). Avec elle, l'éditeur accepte les images : le bouton
   * de la barre d'outils, le collage d'une capture, le glisser-déposer.
   */
  onUploadImage?: (file: File) => Promise<string>;
  /**
   * Les seules mises en forme proposées (barre d'outils, raccourcis, aide), quand le texte sera affiché avec moins
   * de Markdown : une description de projet n'a que le gras, le code et les listes. Toutes par défaut
   */
  formats?: readonly MarkdownFormat[];
  ref?: Ref<MarkdownEditorHandle>;
  className?: string;
}

/**
 * Éditeur Markdown : une barre d'outils (gras, italique, lien, titre, citation, code, listes), ses raccourcis
 * (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+E), et l'aperçu du rendu final. Chaque mise en forme passe par l'historique du
 * champ : Ctrl+Z l'annule. Une liste se continue à la ligne suivante, et coller une adresse sur du texte
 * sélectionné en fait un lien. Le champ grandit avec le texte.
 *
 * Avec `onUploadImage`, on y met des images : le bouton « Image », une capture collée, des fichiers déposés. Un
 * repère (« Envoi de photo.jpg… ») prend leur place dans le texte le temps de l'envoi, puis devient l'image ; on
 * continue d'écrire pendant ce temps.
 */
export default function MarkdownEditor({
  value,
  onChange,
  label,
  id,
  placeholder,
  minRows = 6,
  maxLength,
  onSubmit,
  onCancel,
  onFocus,
  invalid = false,
  describedBy,
  autoFocus = false,
  variant = 'full',
  hint,
  onUploadImage,
  formats,
  ref,
  className,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const fallbackId = useId();
  const areaId = id ?? fallbackId;
  const panelId = `${areaId}-panel`;
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  // Le texte à jour : un envoi d'image qui se termine y remplace son repère, même si l'on a écrit entre-temps
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const modifier = isApple ? '⌘' : 'Ctrl';
  const full = variant === 'full';
  const tools = formats ? TOOLS.filter((tool) => formats.includes(tool.format)) : TOOLS;

  useImperativeHandle(ref, () => ({
    focus: () => {
      setMode('write');
      requestAnimationFrame(() => area.current?.focus());
    },
  }));

  // Le champ grandit avec le texte (et rétrécit quand on efface), à partir de sa hauteur de départ
  useLayoutEffect(() => {
    const element = area.current;
    if (!element || mode !== 'write') {
      return;
    }
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [value, mode]);

  function apply(format: Format) {
    const element = area.current;
    if (!element) {
      return;
    }
    const { selectionStart: start, selectionEnd: end } = element;
    const selected = value.slice(start, end);

    const wrap = (before: string, after: string, placeholderText: string) => {
      const text = selected || placeholderText;
      insert(element, start, end, `${before}${text}${after}`, start + before.length, start + before.length + text.length);
    };

    switch (format) {
      case 'bold':
        return wrap('**', '**', t('editor.sample.bold'));
      case 'italic':
        return wrap('_', '_', t('editor.sample.italic'));
      case 'code':
        return wrap('`', '`', t('editor.sample.code'));
      case 'link': {
        // Le texte sélectionné devient le libellé ; l'adresse est sélectionnée, prête à être collée
        const text = selected || t('editor.sample.link');
        const url = 'https://';
        const inserted = `[${text}](${url})`;
        const urlStart = start + text.length + 3;
        return insert(element, start, end, inserted, urlStart, urlStart + url.length);
      }
      case 'codeBlock': {
        const before = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
        const code = selected || t('editor.sample.code');
        const inserted = `${before}\`\`\`\n${code}\n\`\`\`\n`;
        const codeStart = start + before.length + 4;
        return insert(element, start, end, inserted, codeStart, codeStart + code.length);
      }
      default: {
        const prefix = LINE_PREFIXES[format];
        if (!prefix) {
          return;
        }
        // Toutes les lignes touchées par la sélection ; un second clic retire le préfixe
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const nextBreak = value.indexOf('\n', end);
        const lineEnd = nextBreak === -1 ? value.length : nextBreak;
        const lines = value.slice(lineStart, lineEnd).split('\n');
        const prefixed = lines.every((line, index) => line.startsWith(prefix(index)));
        const replaced = lines
          .map((line, index) => (prefixed ? line.slice(prefix(index).length) : `${prefix(index)}${line}`))
          .join('\n');
        return insert(element, lineStart, lineEnd, replaced, lineStart, lineStart + replaced.length);
      }
    }
  }

  // Entrée dans une liste : la puce suivante (ou le numéro suivant) ; sur une puce vide, la liste s'arrête
  function continueList(element: HTMLTextAreaElement): boolean {
    const { selectionStart: start, selectionEnd: end } = element;
    if (start !== end) {
      return false;
    }
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const line = value.slice(lineStart, start);
    const match = LIST_ITEM.exec(line);
    if (!match) {
      return false;
    }
    const [, indent, marker, number, task, content] = match;
    if (!content.trim()) {
      insert(element, lineStart, start, '', lineStart, lineStart);
      return true;
    }
    const next = `${indent}${number ? `${Number(number) + 1}.` : marker} ${task ? '[ ] ' : ''}`;
    insert(element, start, start, `\n${next}`, start + next.length + 1, start + next.length + 1);
    return true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (mod && !event.shiftKey && !event.altKey) {
      const tool = tools.find((candidate) => candidate.key === event.key.toLowerCase());
      if (tool) {
        event.preventDefault();
        apply(tool.format);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey && !mod && !event.nativeEvent.isComposing && continueList(event.currentTarget)) {
      event.preventDefault();
    }
  }

  // Coller une adresse sur du texte sélectionné : un lien
  /**
   * Envoie des images : un repère par image, à l'endroit du curseur (comme la frappe, Ctrl+Z l'annule), puis
   * l'image à sa place une fois en ligne, avec une description à compléter (pour les lecteurs d'écran). Un échec
   * retire le repère et le dit.
   */
  function uploadImages(files: File[]) {
    const element = area.current;
    if (!onUploadImage || !element || files.length === 0) {
      return;
    }
    if (files.length > MAX_IMAGES_AT_ONCE) {
      toast(t('editor.tooManyImages', { count: MAX_IMAGES_AT_ONCE }));
    }
    files.slice(0, MAX_IMAGES_AT_ONCE).forEach((file) => {
      uploadSequence += 1;
      const marker = `![${t('editor.uploading', { name: file.name.replace(/[[\]]/g, ''), id: uploadSequence })}]()`;
      const { selectionStart: start, selectionEnd: end } = element;
      const before = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
      const text = `${before}${marker}\n`;
      insert(element, start, end, text, start + text.length, start + text.length);

      setUploading((count) => count + 1);
      onUploadImage(file)
        .then((url) => onChange(latest.current.replace(marker, `![${t('editor.imageAlt')}](${url})`)))
        .catch((error: unknown) => {
          onChange(latest.current.replace(`${marker}\n`, '').replace(marker, ''));
          toast.error(error instanceof Error ? error.message : t('editor.uploadFailed', { name: file.name }));
        })
        .finally(() => setUploading((count) => count - 1));
    });
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!onUploadImage || !event.dataTransfer.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (!onUploadImage || !event.dataTransfer.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    setDragging(false);
    setMode('write');
    const images = imagesOf(event.dataTransfer.files);
    if (images.length === 0) {
      toast.error(t('editor.imageType', { name: event.dataTransfer.files[0]?.name ?? '' }));
      return;
    }
    // Le curseur suit le dépôt : à la fin du texte s'il n'était pas dans le champ
    requestAnimationFrame(() => uploadImages(images));
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const element = event.currentTarget;
    // Une capture d'écran collée : elle s'envoie
    const pastedImages = onUploadImage ? imagesOf(event.clipboardData.files) : [];
    if (pastedImages.length > 0) {
      event.preventDefault();
      uploadImages(pastedImages);
      return;
    }
    const pasted = event.clipboardData.getData('text/plain').trim();
    const { selectionStart: start, selectionEnd: end } = element;
    if (start === end || !/^https?:\/\/\S+$/i.test(pasted)) {
      return;
    }
    event.preventDefault();
    const inserted = `[${value.slice(start, end)}](${pasted})`;
    insert(element, start, end, inserted, start + inserted.length, start + inserted.length);
  }

  const remaining = maxLength === undefined ? undefined : maxLength - value.length;
  // Le compteur ne s'affiche qu'à l'approche de la limite : avant, il distrait
  const showCount = remaining !== undefined && remaining < Math.min(500, maxLength! * 0.2);

  const imageButton = onUploadImage && (
    <button
      type="button"
      title={t('editor.tools.image')}
      aria-label={t('editor.tools.image')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        setMode('write');
        picker.current?.click();
      }}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground',
        focusRing,
      )}
    >
      <ImagePlus aria-hidden className="size-4" />
    </button>
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        // Quitter un enfant pour un autre ne compte pas : seulement sortir de l'éditeur
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={onDrop}
      className={cn(
        'markdown-editor group/editor relative overflow-hidden rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-200',
        invalid ? 'border-coral/60' : 'border-border focus-within:border-gold/55',
        'focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
        className,
      )}
    >
      {onUploadImage && (
        <input
          ref={picker}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(event) => {
            uploadImages(imagesOf(event.target.files));
            // Le même fichier peut être choisi de nouveau
            event.target.value = '';
          }}
        />
      )}
      {/* Des fichiers survolent l'éditeur : il les attend */}
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-1.5 z-10 grid place-items-center rounded-xl border-2 border-dashed border-gold/60 bg-surface/85 backdrop-blur-sm saver:bg-surface"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gold">
            <ImagePlus className="size-5" />
            {t('editor.dropImage')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 border-b border-border-subtle px-1.5 py-1.5">
        <div role="tablist" aria-label={t('editor.mode')} className="flex shrink-0 gap-0.5 rounded-xl bg-foreground/5 p-0.5">
          {(['write', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              aria-controls={panelId}
              onClick={() => setMode(tab)}
              className={cn(
                'h-7 rounded-[0.625rem] px-2.5 text-xs font-semibold transition-colors',
                mode === tab ? 'bg-surface text-foreground shadow-[0_1px_3px_var(--float-shadow)]' : 'text-muted-foreground hover:text-foreground',
                focusRing,
              )}
            >
              {t(tab === 'write' ? 'editor.write' : 'editor.preview')}
            </button>
          ))}
        </div>

        {full && mode === 'write' && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
            <div role="toolbar" aria-label={t('editor.toolbar')} aria-controls={areaId} className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
              {tools.map(({ format, icon: Icon, key }) => {
                const name = t(`editor.tools.${format}`);
                const title = key ? `${name} (${modifier}+${key.toUpperCase()})` : name;
                return (
                  <button
                    key={format}
                    type="button"
                    title={title}
                    aria-label={title}
                    // Le champ garde sa sélection : le bouton ne prend pas le focus au clic
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => apply(format)}
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground',
                      focusRing,
                    )}
                  >
                    <Icon aria-hidden className="size-4" />
                  </button>
                );
              })}
              {imageButton}
            </div>
          </>
        )}
        {!full && mode === 'write' && imageButton}
        <MarkdownHelp formats={formats} className="ms-auto" />
      </div>

      <div id={panelId} role="tabpanel">
        {mode === 'write' ? (
          <textarea
            ref={area}
            id={areaId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            placeholder={placeholder}
            rows={minRows}
            maxLength={maxLength}
            autoFocus={autoFocus}
            dir="auto"
            spellCheck
            className="block max-h-[70dvh] w-full resize-none bg-transparent px-4 py-3 text-base leading-relaxed text-foreground outline-none placeholder:text-faint-foreground sm:text-[0.9375rem]"
          />
        ) : (
          <div className="min-h-32 px-4 py-3" style={{ minHeight: `${minRows * 1.6 + 1.5}rem` }}>
            {value.trim() ? (
              <MarkdownContent size={full ? 'md' : 'sm'}>{value}</MarkdownContent>
            ) : (
              <p className="text-sm text-faint-foreground">{t('editor.emptyPreview')}</p>
            )}
          </div>
        )}
      </div>

      {(hint || showCount || uploading > 0) && (
        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2 font-mono text-[0.6875rem] text-muted-foreground">
          {uploading > 0 ? (
            <span role="status" className="flex min-w-0 flex-1 items-center gap-2 text-gold">
              <PulsatingDots size="sm" />
              <span className="truncate">{t('editor.uploadingStatus', { count: uploading })}</span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate">{hint}</span>
          )}
          {showCount && (
            <span className={cn('shrink-0 tabular-nums', remaining! < 0 ? 'text-coral' : remaining! < 100 && 'text-gold')}>
              {t('editor.remaining', { count: remaining })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Les bases du Markdown, écrites telles qu'on les tape, autour d'un mot d'exemple
const CHEATSHEET: readonly [Format, (word: string) => string][] = [
  ['bold', (word) => `**${word}**`],
  ['italic', (word) => `_${word}_`],
  ['link', (word) => `[${word}](https://…)`],
  ['heading', (word) => `## ${word}`],
  ['quote', (word) => `> ${word}`],
  ['code', () => '`code`'],
  ['codeBlock', () => '```java'],
  ['list', (word) => `- ${word}`],
  ['orderedList', (word) => `1. ${word}`],
];

/** « Aide » : un mémo des bases du Markdown, dans une bulle. */
function MarkdownHelp({ formats, className }: { formats?: readonly MarkdownFormat[]; className?: string }) {
  const { t } = useTranslation();
  const word = t('editor.sample.word');

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground',
          'data-[state=open]:bg-foreground/7 data-[state=open]:text-foreground',
          focusRing,
          className,
        )}
      >
        <svg aria-hidden viewBox="0 0 208 128" className="h-3 w-auto fill-current">
          <path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0-30-33h20V30h20v35h20z" />
        </svg>
        <span className="hidden sm:inline">{t('editor.help')}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <p className="eyebrow mb-2">{t('editor.helpTitle')}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {CHEATSHEET.filter(([format]) => !formats || formats.includes(format)).map(([format, syntax]) => (
              <div key={format} className="contents">
                <dt dir="auto" className="font-mono text-soft-foreground">
                  {syntax(word)}
                </dt>
                <dd className="text-muted-foreground">{t(`editor.tools.${format}`)}</dd>
              </div>
            ))}
          </dl>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
