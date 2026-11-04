import { createLowlight } from 'lowlight';
import { CODE_LANGUAGES } from './codeLanguages';

/**
 * Le coloriseur de code de l'application, avec les langages choisis (lib/codeLanguages.ts) : les blocs de code du
 * Markdown (lib/rehypeCodeHighlight.ts) et le diff des revues (lib/diff.ts). Les classes sont celles de highlight.js
 * (styles/markdown.css).
 */
export const lowlight = createLowlight(CODE_LANGUAGES);
