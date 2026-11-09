import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { LEGAL_UPDATED, legalLanguage, type LegalDocument, type LegalLanguage } from '@/content/legal/types';
import { paths } from '@/router/paths';

const link =
  'font-medium text-foreground underline decoration-gold/60 underline-offset-4 transition-colors hover:decoration-gold';

// Les liens glissés dans les textes, dans la langue du texte
const LINK_LABELS: Record<LegalLanguage, { privacy: string; terms: string }> = {
  fr: { privacy: 'règles de confidentialité', terms: "conditions d'utilisation" },
  en: { privacy: 'privacy policy', terms: 'terms of use' },
};

/** Un texte, avec ses marques {email}, {privacy} et {terms} devenues des liens */
function Rich({ text, language }: { text: string; language: LegalLanguage }) {
  return text.split(/(\{email\}|\{privacy\}|\{terms\})/).map((part, index) => {
    switch (part) {
      case '{email}':
        return (
          <a key={index} href={`mailto:${site.contactEmail}`} className={link}>
            {site.contactEmail}
          </a>
        );
      case '{privacy}':
        return (
          <Link key={index} to={paths.privacy} className={link}>
            {LINK_LABELS[language].privacy}
          </Link>
        );
      case '{terms}':
        return (
          <Link key={index} to={paths.terms} className={link}>
            {LINK_LABELS[language].terms}
          </Link>
        );
      default:
        return part;
    }
  });
}

/**
 * Un texte légal (confidentialité, conditions d'utilisation), en français ou en anglais selon la langue de
 * l'interface. Dans une autre langue, une mention prévient que le texte n'existe qu'en ces deux langues.
 */
export default function LegalArticle({ documents }: { documents: Record<LegalLanguage, LegalDocument> }) {
  const { t, i18n } = useTranslation();
  const language = legalLanguage(i18n.resolvedLanguage);
  const document = documents[language];
  // La date de la version, dans la langue de l'interface (UTC : le jour ne glisse pas selon le fuseau)
  const updated = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${LEGAL_UPDATED}T00:00:00Z`),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-6 lg:pt-14 lg:pb-28">
      <p className="eyebrow">{site.name}</p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{t('legal.updated', { date: updated })}</p>
      {i18n.resolvedLanguage !== language && (
        <p className="mt-5 rounded-xl border border-gold/25 bg-gold/8 px-4 py-3 text-sm leading-relaxed text-soft-foreground">
          {t('legal.languageNote')}
        </p>
      )}

      {/* Le texte garde sa langue et son sens d'écriture, même sous une interface en arabe */}
      <article lang={language} dir="ltr">
        <h1 className="mt-6 font-display text-h1">{document.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-soft-foreground">{document.intro}</p>

        {document.sections.map((section) => (
          <section key={section.title} className="mt-12">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
            {section.blocks.map((block, index) =>
              Array.isArray(block) ? (
                <ul key={index} className="mt-4 list-disc space-y-2.5 ps-5 leading-relaxed text-soft-foreground marker:text-gold">
                  {block.map((item) => (
                    <li key={item}>
                      <Rich text={item} language={language} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={index} className="mt-4 leading-relaxed text-soft-foreground">
                  <Rich text={block} language={language} />
                </p>
              ),
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
