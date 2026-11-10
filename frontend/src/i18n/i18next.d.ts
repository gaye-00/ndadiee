import type admin from './locales/fr/admin.json';
import type common from './locales/fr/common.json';
import type dashboard from './locales/fr/dashboard.json';
import type forum from './locales/fr/forum.json';
import type hackathons from './locales/fr/hackathons.json';
import type messages from './locales/fr/messages.json';
import type openings from './locales/fr/openings.json';
import type profile from './locales/fr/profile.json';
import type projectCode from './locales/fr/projectCode.json';
import type projectForm from './locales/fr/projectForm.json';
import type reviews from './locales/fr/reviews.json';
import type showcase from './locales/fr/showcase.json';
import type workspace from './locales/fr/workspace.json';

// Clés de traduction typées à partir du français : t('nav.forum') est vérifié à la compilation,
// et l'éditeur propose les clés existantes. Une fonctionnalité peut avoir son espace de noms, chargé
// avec le code de ses pages (router/pages.ts) : useTranslation('hackathons').
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      admin: typeof admin;
      common: typeof common;
      dashboard: typeof dashboard;
      forum: typeof forum;
      hackathons: typeof hackathons;
      messages: typeof messages;
      openings: typeof openings;
      profile: typeof profile;
      projectCode: typeof projectCode;
      projectForm: typeof projectForm;
      reviews: typeof reviews;
      showcase: typeof showcase;
      workspace: typeof workspace;
    };
  }
}
