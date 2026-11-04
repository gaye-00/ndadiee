const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Un texte, avec les mots cherchés éclairés. */
export default function Highlight({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter((word) => word.length >= 2).map(escapeRegExp);
  if (words.length === 0) {
    return text;
  }
  // Découper autour d'un groupe capturant : les mots trouvés sont aux rangs impairs
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'giu'));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-[0.1875rem] bg-gold/25 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
