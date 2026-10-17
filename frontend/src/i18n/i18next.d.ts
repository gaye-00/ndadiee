import type common from './locales/fr/common.json';

// Clés de traduction typées à partir du français : t('nav.forum') est vérifié à la compilation,
// et l'éditeur propose les clés existantes.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
    };
  }
}
