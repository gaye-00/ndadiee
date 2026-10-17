export type MarkdownBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

/** Découpe un Markdown simple en paragraphes et listes à puces (descriptions de projet). */
export function markdownBlocks(markdown: string | null | undefined): MarkdownBlock[] {
  if (!markdown) {
    return [];
  }
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): MarkdownBlock => {
      const lines = block.split('\n').map((line) => line.trim());
      if (lines.every((line) => /^[-*+]\s+/.test(line))) {
        return { kind: 'list', items: lines.map((line) => line.replace(/^[-*+]\s+/, '')) };
      }
      return { kind: 'paragraph', text: lines.join(' ').replace(/^#{1,6}\s+/, '') };
    });
}
