import { createLowlight } from 'lowlight';
import { CODE_LANGUAGES } from './codeLanguages';

// Ce qu'il faut de l'arbre HTML produit par le Markdown (hast) pour trouver les blocs de code
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

const lowlight = createLowlight(CODE_LANGUAGES);

const textOf = (node: HastNode): string => (node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join(''));

function visit(node: HastNode, parent: HastNode | undefined) {
  if (node.type === 'element' && node.tagName === 'code' && parent?.tagName === 'pre') {
    const classes = Array.isArray(node.properties?.className) ? node.properties.className.map(String) : [];
    const language = classes.find((name) => name.startsWith('language-'))?.slice('language-'.length);
    if (language && lowlight.registered(language)) {
      node.properties = { ...node.properties, className: ['hljs', ...classes] };
      node.children = lowlight.highlight(language, textOf(node), { prefix: 'hljs-' }).children as HastNode[];
    }
    return;
  }
  node.children?.forEach((child) => visit(child, node));
}

/**
 * Colore les blocs de code d'un contenu Markdown (```java), avec les langages choisis (lib/codeLanguages.ts) :
 * plus léger que rehype-highlight, qui embarque toujours ses 37 langages par défaut. Un bloc sans langage, ou d'un
 * langage inconnu, reste tel quel. Les classes sont celles de highlight.js (styles/markdown.css).
 */
export default function rehypeCodeHighlight() {
  return (tree: HastNode) => visit(tree, undefined);
}
