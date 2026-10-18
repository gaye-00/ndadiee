import { ImageIcon, Link2 } from 'lucide-react';
import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown, { type Components, type ExtraProps, type Options } from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import rehypeCodeHighlight from '@/lib/rehypeCodeHighlight';
import { cn } from '@/lib/utils';
import { useDataSaverStore } from '@/store/useDataSaverStore';

// Un élément HTML de l'arbre que produit le Markdown, et ce qu'il contient
type Element = NonNullable<ExtraProps['node']>;
type ElementContent = Element['children'][number];

const remarkPlugins: Options['remarkPlugins'] = [remarkGfm];
// Seulement les blocs dont le langage est indiqué (```java) : deviner coûte cher et se trompe souvent
const rehypePlugins: Options['rehypePlugins'] = [rehypeCodeHighlight];

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Le texte d'un nœud, sans sa mise en forme : pour l'ancre d'un titre. */
function textOf(node: Element | ElementContent | undefined): string {
  if (!node) {
    return '';
  }
  if (node.type === 'text') {
    return node.value;
  }
  return 'children' in node ? node.children.map(textOf).join('') : '';
}

/** « Ce que j'ai essayé » → « ce-que-j-ai-essaye » */
function anchorOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

interface MarkdownContentProps {
  /** Le texte Markdown, écrit par un membre */
  children: string;
  /** md : le contenu d'un sujet ; sm : une réponse, un commentaire */
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * Rendu d'un contenu Markdown écrit par un membre (sujets du forum, réponses, commentaires) : le Markdown de GitHub
 * (tableaux, listes de tâches, texte barré), le code coloré avec son bouton « copier », des ancres sur les titres.
 *
 * Le HTML écrit dans le texte n'est jamais interprété (pas d'injection de script). Les titres descendent d'un
 * niveau (un « # » devient un h2) : la page garde un seul h1, son titre. Les liens vers une autre page du site
 * restent dans l'application ; les autres s'ouvrent dans un nouvel onglet, sans transmettre la page d'origine. En
 * économie de données, une image attend qu'on la demande.
 */
export default function MarkdownContent({ children, size = 'md', className }: MarkdownContentProps) {
  // Une ancre par titre, unique dans le contenu : « installation », « installation-2 »…
  const anchors = new Map<string, number>();
  const anchor = (node: Element | undefined) => {
    const base = anchorOf(textOf(node)) || 'section';
    const seen = anchors.get(base) ?? 0;
    anchors.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  const heading =
    (Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
    ({ node, children: content }: ComponentPropsWithoutRef<'h2'> & ExtraProps) => <Heading as={Tag} id={anchor(node)}>{content}</Heading>;

  const components: Components = {
    h1: heading('h2'),
    h2: heading('h3'),
    h3: heading('h4'),
    h4: heading('h5'),
    h5: heading('h6'),
    h6: heading('h6'),
    a: ({ href, children: content }) => <MarkdownLink href={href}>{content}</MarkdownLink>,
    pre: ({ node, children: content }) => {
      const code = node?.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code');
      const classes = (code?.properties.className as string[] | undefined) ?? [];
      const language = classes.find((name) => name.startsWith('language-'))?.slice('language-'.length);
      return <CodeBlock language={language}>{content}</CodeBlock>;
    },
    img: ({ src, alt }) => (typeof src === 'string' ? <MarkdownImage src={src} alt={alt ?? ''} /> : null),
    // Un tableau large défile dans son cadre, sans élargir la page
    table: ({ children: content }) => (
      <div className="markdown-table not-prose my-5 overflow-x-auto rounded-xl border border-border">
        <table>{content}</table>
      </div>
    ),
  };

  return (
    <div dir="auto" className={cn('markdown prose max-w-none', size === 'sm' && 'markdown-sm prose-sm', className)}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components} skipHtml>
        {children}
      </Markdown>
    </div>
  );
}

/** Un titre du contenu, et son ancre : au survol, un lien vers cette partie de la page. */
function Heading({ as: Tag, id, children }: { as: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; id: string; children: ReactNode }) {
  return (
    <Tag id={id} className="group/heading relative scroll-mt-28">
      {children}
      <a
        href={`#${id}`}
        aria-hidden
        tabIndex={-1}
        className="ms-2 inline-grid size-6 place-items-center rounded-md align-middle text-faint-foreground no-underline opacity-0 transition-opacity group-hover/heading:opacity-100 hover:text-gold"
      >
        <Link2 className="size-4" />
      </a>
    </Tag>
  );
}

/** Lien du contenu : dans l'application pour une page du site, dans un nouvel onglet sinon. */
function MarkdownLink({ href, children }: { href: string | undefined; children: ReactNode }) {
  if (!href) {
    return <>{children}</>;
  }
  const url = (() => {
    try {
      return new URL(href, window.location.origin);
    } catch {
      return null;
    }
  })();
  if (!url || !['http:', 'https:', 'mailto:'].includes(url.protocol)) {
    // javascript:, data:… : affiché comme du texte, jamais suivi
    return <span>{children}</span>;
  }
  if (url.origin === window.location.origin && !href.startsWith('//')) {
    return (
      <Link to={`${url.pathname}${url.search}${url.hash}`} viewTransition={url.pathname !== window.location.pathname}>
        {children}
      </Link>
    );
  }
  return (
    // ugc, nofollow : un lien écrit par un membre ne transmet pas la réputation du site
    <a href={url.href} target="_blank" rel="noopener noreferrer nofollow ugc">
      {children}
    </a>
  );
}

/** Image du contenu : chargée à l'approche de l'écran ; en économie de données, sur demande. */
function MarkdownImage({ src, alt }: { src: string; alt: string }) {
  const { t } = useTranslation();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const [requested, setRequested] = useState(!dataSaver);

  if (!requested) {
    return (
      <button
        type="button"
        onClick={() => setRequested(true)}
        className={cn(
          'not-prose hatch my-4 inline-flex h-24 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-sm font-semibold text-soft-foreground',
          focusRing,
        )}
      >
        <ImageIcon aria-hidden className="size-4" />
        {t('media.showImage')}
        {alt && <span className="max-w-[40%] truncate font-normal text-muted-foreground">· {alt}</span>}
      </button>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className="rounded-xl border border-border" />;
}
