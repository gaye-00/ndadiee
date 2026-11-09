/**
 * Un texte légal (confidentialité, conditions d'utilisation). Rédigé en français et en anglais seulement : les
 * autres langues de l'interface affichent l'une des deux (voir legalLanguage).
 *
 * Dans les textes, trois marques deviennent des liens : {email} (l'adresse de contact), {privacy} et {terms}.
 */
export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export interface LegalSection {
  title: string;
  /** Un paragraphe (texte) ou une liste à puces (tableau de textes) */
  blocks: Array<string | string[]>;
}

export type LegalLanguage = 'fr' | 'en';

/** Le français pour le français et le wolof, l'anglais pour les autres langues de l'interface */
export function legalLanguage(language: string | undefined): LegalLanguage {
  return language === 'fr' || language === 'wo' ? 'fr' : 'en';
}

/** Dernière mise à jour des deux textes */
export const LEGAL_UPDATED = '2026-11-09';
