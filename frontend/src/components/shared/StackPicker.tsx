import { Hash, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import FacetPicker, { type FacetOption } from './FacetPicker';
import StackLogo from './StackLogo';
import { isTechnology, tagLogoOf } from '@/config/stacks';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTagName } from '@/hooks/useTags';

/** Une technologie proposée : son slug, son nom, et combien de résultats elle donnerait avec les autres filtres */
export interface StackChoice {
  slug: string;
  name: string;
  count: number;
}

/** Le logo d'une technologie quand il y en a un ; un dièse pour un thème (« Open Data »). */
function stackGlyph(slug: string, technology: boolean, logos: ReturnType<typeof useStackLogos>): ReactNode {
  const logo = tagLogoOf(slug);
  if (logo && logos !== false) {
    return <StackLogo path={logos?.[logo]} className="size-3.5 text-soft-foreground" />;
  }
  return technology ? undefined : <Hash className="size-3.5 text-faint-foreground" />;
}

interface StackPickerProps {
  value: string | null;
  /** Les technologies des résultats, les plus présentes d'abord ; undefined tant qu'elles chargent */
  stacks: readonly StackChoice[] | undefined;
  onChange: (value: string | null) => void;
  className?: string;
}

/**
 * Le filtre par technologie d'une page à filtrer (vitrine, annonces) : les technologies d'abord, avec leur
 * logo, puis les thèmes (« Open Data », « IoT »).
 */
export default function StackPicker({ value, stacks, onChange, className }: StackPickerProps) {
  const { t } = useTranslation();
  const logos = useStackLogos();
  const name = useTagName(value, stacks);
  const technologies = t('filters.technologies');
  const topics = t('filters.topics');

  // La technologie choisie reste dans la liste, même sans résultat avec les autres filtres : on peut la retirer
  const known = stacks ?? [];
  const listed = value && !known.some((stack) => stack.slug === value) ? [{ slug: value, name: name ?? value, count: 0 }, ...known] : known;
  const options: FacetOption[] = listed.map((stack) => {
    const technology = tagLogoOf(stack.slug) !== undefined || isTechnology(stack.name);
    return {
      value: stack.slug,
      label: stack.name,
      count: stack.count,
      group: technology ? technologies : topics,
      icon: stackGlyph(stack.slug, technology, logos),
    };
  });

  return (
    <FacetPicker
      label={t('filters.stack')}
      icon={Layers}
      value={value}
      selected={value && name ? { label: name, icon: stackGlyph(value, true, logos) } : undefined}
      options={options}
      groups={[technologies, topics]}
      anyLabel={t('filters.anyStack')}
      searchPlaceholder={t('filters.stackSearch')}
      emptyLabel={t('filters.noStack')}
      loading={stacks === undefined}
      onChange={onChange}
      className={className}
    />
  );
}
