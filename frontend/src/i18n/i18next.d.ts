import type common from './locales/fr/common.json';
import type hackathons from './locales/fr/hackathons.json';
import type showcase from './locales/fr/showcase.json';

// Clés de traduction typées à partir du français : t('nav.forum') est vérifié à la compilation,
// et l'éditeur propose les clés existantes. Une fonctionnalité peut avoir son espace de noms, chargé
// avec le code de ses pages (router/pages.ts) : useTranslation('hackathons').
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      hackathons: typeof hackathons;
      showcase: typeof showcase;
    };
  }
}
