import { Earth } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FacetPicker, { type FacetOption } from './FacetPicker';
import { countryFlag, countryName } from '@/utils/formatters';

/** Un pays proposé (code ISO à 2 lettres), et combien de résultats il donnerait avec les autres filtres */
export interface CountryChoice {
  country: string;
  count: number;
}

// Les noms anglais se cherchent aussi : « south africa » trouve l'Afrique du Sud, « ethiopia » l'Éthiopie
const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });

function englishName(code: string): string {
  try {
    return englishNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const flag = (code: string) => <span className="text-base leading-none">{countryFlag(code)}</span>;

interface CountryPickerProps {
  value: string | null;
  /** Les pays des porteurs, les plus représentés d'abord ; undefined tant qu'ils chargent */
  countries: readonly CountryChoice[] | undefined;
  onChange: (value: string | null) => void;
  className?: string;
}

/**
 * Le filtre par pays du porteur du projet d'une page à filtrer (vitrine, annonces) : son drapeau, son nom dans
 * la langue de l'interface, qui se cherche aussi en anglais.
 */
export default function CountryPicker({ value, countries, onChange, className }: CountryPickerProps) {
  const { t } = useTranslation();

  // Le pays choisi reste dans la liste, même sans résultat avec les autres filtres : on peut le retirer
  const known = countries ?? [];
  const listed = value && !known.some((choice) => choice.country === value) ? [{ country: value, count: 0 }, ...known] : known;
  const options: FacetOption[] = listed.map(({ country, count }) => ({
    value: country,
    label: countryName(country),
    count,
    icon: flag(country),
    keywords: [countryName(country), englishName(country), country],
  }));

  return (
    <FacetPicker
      label={t('filters.country')}
      icon={Earth}
      value={value}
      selected={value ? { label: countryName(value), icon: flag(value) } : undefined}
      options={options}
      anyLabel={t('filters.anyCountry')}
      searchPlaceholder={t('filters.countrySearch')}
      emptyLabel={t('filters.noCountry')}
      hint={t('filters.countryHint')}
      loading={countries === undefined}
      onChange={onChange}
      className={className}
    />
  );
}
