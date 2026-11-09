import type { LegalDocument, LegalLanguage } from './types';

/**
 * Règles de confidentialité. Elles décrivent ce que fait réellement la plateforme : à mettre à jour avec elle
 * (nouvelle donnée recueillie, nouveau prestataire, nouveau fournisseur de connexion).
 */
export const privacy: Record<LegalLanguage, LegalDocument> = {
  fr: {
    title: 'Règles de confidentialité',
    intro:
      "Ndadiee est une plateforme où les développeurs présentent leurs projets, forment des équipes et travaillent ensemble. Cette page explique quelles données nous recueillons, pourquoi, et ce que tu peux en faire. Nous ne vendons pas tes données et nous n'affichons pas de publicité.",
    sections: [
      {
        title: 'Qui sommes-nous',
        blocks: [
          'Ndadiee (ndadiee.com) est édité par Abdoulaye Gaye, au Sénégal, responsable du traitement de tes données. Pour toute question : {email}.',
        ],
      },
      {
        title: 'Les données que nous recueillons',
        blocks: [
          [
            "Ton compte : nom d'utilisateur, nom complet, adresse e-mail, langue préférée et mot de passe. Le mot de passe n'est enregistré que sous une forme hachée, illisible même pour nous.",
            'Ton profil, si tu le remplis : photo, biographie, pays, ville, compétences, niveau, liens (GitHub, LinkedIn, site web) et disponibilité pour un emploi.',
            'Ce que tu publies : projets, rôles recherchés, questions, réponses, commentaires, votes, revues de code, participations aux hackathons, et les messages que tu échanges avec les autres membres.',
            'Des données techniques : la date de ta dernière connexion, et les journaux du serveur (adresse IP, date, page demandée), utilisés pour la sécurité et le bon fonctionnement du service.',
          ],
        ],
      },
      {
        title: 'Connexion avec Google ou GitHub',
        blocks: [
          "Si tu choisis « Continuer avec Google » ou « Continuer avec GitHub », ce service nous transmet, avec ton accord : l'identifiant de ton compte chez lui, ton nom, ton adresse e-mail vérifiée et ta photo de profil ; pour GitHub, aussi ton pseudo et l'adresse de ton profil public.",
          'Nous utilisons ces informations uniquement pour créer ton compte Ndadiee ou te reconnecter, et pour préremplir ton profil. Nous ne gardons aucun accès à ton compte Google ou GitHub : nous ne pouvons ni lire tes e-mails, ni voir tes dépôts privés, ni agir en ton nom. Tu peux retirer cette autorisation à tout moment dans les réglages de ton compte Google ou GitHub.',
          "L'utilisation des informations reçues des API Google respecte le Règlement sur les données utilisateur des services d'API Google, y compris ses exigences d'utilisation limitée.",
        ],
      },
      {
        title: 'Pourquoi nous les utilisons',
        blocks: [
          [
            'Faire fonctionner la plateforme : ton compte, ton profil public, tes projets, tes équipes et ta messagerie.',
            "T'envoyer des notifications liées à ton activité (par exemple une revue de ton code), que tu peux désactiver dans tes réglages.",
            "Protéger le service : prévenir les abus, modérer les contenus et suspendre un compte qui enfreint les {terms}.",
          ],
          "Nous n'utilisons tes données ni pour de la publicité, ni pour du profilage commercial, et nous ne les vendons à personne.",
        ],
      },
      {
        title: 'Ce qui est public',
        blocks: [
          "Ton profil (nom d'utilisateur, nom, photo, biographie, pays, compétences, liens) et ce que tu publies dans la vitrine, les annonces, les hackathons et le forum sont visibles par tous, y compris sans compte. Ton adresse e-mail n'est jamais affichée publiquement. L'espace d'équipe d'un projet n'est visible que par ses membres, et tes messages privés que par leurs participants.",
        ],
      },
      {
        title: 'Qui d’autre traite tes données',
        blocks: [
          'Nous ne partageons tes données qu’avec les prestataires techniques nécessaires au service :',
          [
            'Cloudflare, qui protège et accélère le site, mesure de façon anonyme et sans cookie la vitesse de chargement des pages, et stocke les images que tu envoies ;',
            "l'hébergeur de notre serveur, où tournent l'application et sa base de données ;",
            'Google et GitHub, seulement si tu choisis de te connecter avec eux ;',
            'GitHub encore, dont nous lisons les informations publiques des dépôts que tu relies à tes projets.',
          ],
          'Ces prestataires peuvent traiter des données hors du Sénégal ; ils sont tenus de les protéger. Nous ne communiquons tes données à une autorité que si la loi nous y oblige.',
        ],
      },
      {
        title: 'Ce que garde ton navigateur',
        blocks: [
          "Ndadiee n'utilise ni cookie publicitaire ni traceur. Ton navigateur garde localement ta session, pour que tu restes connecté, et tes préférences : thème, langue, mode économie de données. Pendant une connexion avec Google ou GitHub, une valeur temporaire y est gardée le temps de l'aller-retour, puis effacée.",
        ],
      },
      {
        title: 'Combien de temps',
        blocks: [
          'Tes données sont conservées tant que ton compte existe. Si tu demandes sa suppression, nous supprimons ton compte et tes données personnelles dans un délai d’un mois. Les journaux du serveur sont effacés automatiquement après quelques semaines.',
        ],
      },
      {
        title: 'Tes droits',
        blocks: [
          'Tu peux à tout moment consulter et corriger tes informations depuis ton profil et tes réglages. Tu peux aussi demander une copie de tes données, leur suppression avec celle de ton compte, ou t’opposer à un traitement : écris-nous à {email}, nous répondons sous un mois.',
          "Ces droits te sont garantis par la loi sénégalaise n° 2008-12 sur la protection des données à caractère personnel et, si tu te trouves dans l'Union européenne, par le RGPD. Tu peux aussi saisir l'autorité de protection des données de ton pays : au Sénégal, la Commission de protection des données personnelles (CDP).",
        ],
      },
      {
        title: 'Sécurité',
        blocks: [
          "Les échanges avec Ndadiee sont chiffrés (HTTPS), les mots de passe sont hachés et l'accès au serveur est restreint. Aucun système n'est infaillible : si une violation de données te concerne, nous te préviendrons.",
        ],
      },
      {
        title: 'Modifications',
        blocks: [
          "Nous pouvons mettre à jour ces règles. La date en haut de la page indique leur dernière version ; en cas de changement important, nous te préviendrons sur la plateforme ou par e-mail.",
        ],
      },
    ],
  },

  en: {
    title: 'Privacy policy',
    intro:
      'Ndadiee is a platform where developers showcase their projects, build teams and work together. This page explains what data we collect, why, and what you can do about it. We do not sell your data and we do not show ads.',
    sections: [
      {
        title: 'Who we are',
        blocks: [
          'Ndadiee (ndadiee.com) is published by Abdoulaye Gaye, in Senegal, who is responsible for processing your data. Any question: {email}.',
        ],
      },
      {
        title: 'The data we collect',
        blocks: [
          [
            'Your account: username, full name, email address, preferred language and password. The password is only stored hashed, unreadable even to us.',
            'Your profile, if you fill it in: photo, bio, country, city, skills, level, links (GitHub, LinkedIn, website) and whether you are open to work.',
            'What you publish: projects, open roles, questions, answers, comments, votes, code reviews, hackathon entries, and the messages you exchange with other members.',
            'Technical data: the date of your last sign-in, and server logs (IP address, date, requested page), used for security and to keep the service running.',
          ],
        ],
      },
      {
        title: 'Signing in with Google or GitHub',
        blocks: [
          'If you choose “Continue with Google” or “Continue with GitHub”, that service sends us, with your consent: your account identifier there, your name, your verified email address and your profile picture; for GitHub, also your username and the address of your public profile.',
          'We use this information only to create your Ndadiee account or sign you back in, and to prefill your profile. We keep no access to your Google or GitHub account: we cannot read your email, see your private repositories or act on your behalf. You can revoke this permission at any time in your Google or GitHub account settings.',
          "Ndadiee's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
        ],
      },
      {
        title: 'Why we use it',
        blocks: [
          [
            'To run the platform: your account, your public profile, your projects, your teams and your messages.',
            'To send you notifications about your activity (for example a review of your code), which you can turn off in your settings.',
            'To protect the service: prevent abuse, moderate content and suspend an account that breaks the {terms}.',
          ],
          'We do not use your data for advertising or commercial profiling, and we do not sell it to anyone.',
        ],
      },
      {
        title: 'What is public',
        blocks: [
          'Your profile (username, name, photo, bio, country, skills, links) and what you publish in the showcase, openings, hackathons and forum are visible to everyone, including people without an account. Your email address is never shown publicly. A project’s team space is only visible to its members, and your private messages only to their participants.',
        ],
      },
      {
        title: 'Who else processes your data',
        blocks: [
          'We only share your data with the technical providers the service needs:',
          [
            'Cloudflare, which protects and speeds up the site, measures page load speed anonymously and without cookies, and stores the images you upload;',
            'our server host, where the application and its database run;',
            'Google and GitHub, only if you choose to sign in with them;',
            'GitHub again, from which we read public information about the repositories you link to your projects.',
          ],
          'These providers may process data outside Senegal; they are bound to protect it. We only disclose your data to an authority when the law requires us to.',
        ],
      },
      {
        title: 'What your browser keeps',
        blocks: [
          'Ndadiee uses no advertising cookies and no trackers. Your browser stores your session locally, so you stay signed in, and your preferences: theme, language, data saver mode. While you sign in with Google or GitHub, a temporary value is kept there for the round trip, then deleted.',
        ],
      },
      {
        title: 'How long',
        blocks: [
          'We keep your data as long as your account exists. If you ask us to delete it, we delete your account and your personal data within one month. Server logs are deleted automatically after a few weeks.',
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          'You can view and correct your information at any time from your profile and settings. You can also ask for a copy of your data, for its deletion along with your account, or object to its processing: write to {email}, we reply within one month.',
          "These rights are guaranteed by Senegal's Law No. 2008-12 on the protection of personal data and, if you are in the European Union, by the GDPR. You can also contact the data protection authority of your country: in Senegal, the Commission de protection des données personnelles (CDP).",
        ],
      },
      {
        title: 'Security',
        blocks: [
          'Traffic with Ndadiee is encrypted (HTTPS), passwords are hashed and access to the server is restricted. No system is infallible: if a data breach affects you, we will let you know.',
        ],
      },
      {
        title: 'Changes',
        blocks: [
          'We may update this policy. The date at the top of the page shows its latest version; if something important changes, we will tell you on the platform or by email.',
        ],
      },
    ],
  },
};
