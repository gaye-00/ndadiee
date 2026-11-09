import LegalArticle from '@/components/legal/LegalArticle';
import { privacy } from '@/content/legal/privacy';

/** Règles de confidentialité (/privacy) : le lien que montre l'écran de connexion Google. */
export default function PrivacyPage() {
  return <LegalArticle documents={privacy} />;
}
