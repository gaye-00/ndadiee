import type { LegalDocument, LegalLanguage } from './types';

/** Conditions d'utilisation de la plateforme. */
export const terms: Record<LegalLanguage, LegalDocument> = {
  fr: {
    title: "Conditions d'utilisation",
    intro:
      'Ces conditions encadrent l’utilisation de Ndadiee (ndadiee.com). En créant un compte ou en utilisant la plateforme, tu les acceptes.',
    sections: [
      {
        title: 'Le service',
        blocks: [
          "Ndadiee permet aux développeurs de présenter leurs projets, de publier les rôles qu'ils recherchent, de former des équipes, d'échanger sur un forum, de collaborer dans un espace d'équipe (tâches, revues de code, messagerie) et de participer à des hackathons. Le service est gratuit. Il est édité par Abdoulaye Gaye, au Sénégal.",
        ],
      },
      {
        title: 'Ton compte',
        blocks: [
          'Tu dois avoir au moins 13 ans. Tu fournis des informations exactes, tu gardes ton mot de passe secret, et tu es responsable de ce qui se fait depuis ton compte. Tu peux te connecter avec ton adresse e-mail, ou avec Google ou GitHub.',
        ],
      },
      {
        title: 'Ce que tu publies',
        blocks: [
          'Tu restes propriétaire de ce que tu publies : projets, textes, images, code. Tu nous accordes seulement le droit, gratuit et mondial, de l’héberger, de l’afficher et de le diffuser sur Ndadiee, le temps nécessaire au fonctionnement du service.',
          'Tu garantis avoir le droit de publier ce contenu, et tu respectes les licences du code et des images que tu partages.',
        ],
      },
      {
        title: 'Règles de conduite',
        blocks: [
          [
            'Respecte les autres membres : pas de harcèlement, d’insultes, de discours haineux ni de discrimination.',
            'Pas de spam, de publicité non sollicitée ni de faux comptes.',
            'Pas de contenu illégal, trompeur ou malveillant (logiciel malveillant, hameçonnage, données d’autrui publiées sans son accord).',
            'Pas d’atteinte au service : contourner sa sécurité, surcharger ses serveurs ou collecter en masse les données des membres.',
          ],
        ],
      },
      {
        title: 'Modération',
        blocks: [
          'Nous pouvons masquer ou supprimer un contenu qui enfreint ces règles, et suspendre un compte en indiquant le motif à son titulaire. Pour signaler un abus ou contester une décision, écris à {email}.',
        ],
      },
      {
        title: 'Disponibilité et responsabilité',
        blocks: [
          'Nous faisons de notre mieux pour que Ndadiee fonctionne bien, mais le service est fourni « tel quel », sans garantie de disponibilité continue. Les contenus publiés par les membres n’engagent que leurs auteurs : vérifie un projet ou une annonce avant de t’y engager. Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects liés à l’utilisation du service.',
        ],
      },
      {
        title: 'Fin d’utilisation',
        blocks: [
          'Tu peux cesser d’utiliser Ndadiee à tout moment et demander la suppression de ton compte à {email}. Nous pouvons fermer un compte qui enfreint gravement ou de façon répétée ces conditions.',
        ],
      },
      {
        title: 'Données personnelles',
        blocks: ['Ce que nous faisons de tes données est décrit dans nos {privacy}.'],
      },
      {
        title: 'Modifications et droit applicable',
        blocks: [
          'Nous pouvons faire évoluer ces conditions. La date en haut de la page indique leur dernière version, et nous te préviendrons d’un changement important. Ces conditions sont régies par le droit sénégalais. Pour toute question : {email}.',
        ],
      },
    ],
  },

  en: {
    title: 'Terms of use',
    intro: 'These terms govern the use of Ndadiee (ndadiee.com). By creating an account or using the platform, you accept them.',
    sections: [
      {
        title: 'The service',
        blocks: [
          'Ndadiee lets developers showcase their projects, publish the roles they are looking for, build teams, talk on a forum, collaborate in a team space (tasks, code reviews, messages) and take part in hackathons. The service is free. It is published by Abdoulaye Gaye, in Senegal.',
        ],
      },
      {
        title: 'Your account',
        blocks: [
          'You must be at least 13 years old. You provide accurate information, keep your password secret, and are responsible for what happens from your account. You can sign in with your email address, or with Google or GitHub.',
        ],
      },
      {
        title: 'What you publish',
        blocks: [
          'You keep ownership of what you publish: projects, text, images, code. You only grant us the free, worldwide right to host, display and distribute it on Ndadiee, for as long as the service needs to.',
          'You confirm you have the right to publish this content, and you respect the licenses of the code and images you share.',
        ],
      },
      {
        title: 'Rules of conduct',
        blocks: [
          [
            'Respect other members: no harassment, insults, hate speech or discrimination.',
            'No spam, unsolicited advertising or fake accounts.',
            'No illegal, misleading or malicious content (malware, phishing, other people’s data published without their consent).',
            'No harm to the service: bypassing its security, overloading its servers or harvesting members’ data.',
          ],
        ],
      },
      {
        title: 'Moderation',
        blocks: [
          'We may hide or remove content that breaks these rules, and suspend an account, telling its owner why. To report abuse or contest a decision, write to {email}.',
        ],
      },
      {
        title: 'Availability and liability',
        blocks: [
          'We do our best to keep Ndadiee running well, but the service is provided “as is”, without any guarantee of continuous availability. Content published by members is the sole responsibility of its authors: check a project or an opening before committing to it. To the extent permitted by law, we are not liable for indirect damages arising from the use of the service.',
        ],
      },
      {
        title: 'Leaving',
        blocks: [
          'You can stop using Ndadiee at any time and ask for your account to be deleted at {email}. We may close an account that seriously or repeatedly breaks these terms.',
        ],
      },
      {
        title: 'Personal data',
        blocks: ['What we do with your data is described in our {privacy}.'],
      },
      {
        title: 'Changes and governing law',
        blocks: [
          'We may change these terms. The date at the top of the page shows their latest version, and we will tell you about any important change. These terms are governed by the laws of Senegal. Any question: {email}.',
        ],
      },
    ],
  },
};
