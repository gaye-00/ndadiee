import LegalArticle from '@/components/legal/LegalArticle';
import { terms } from '@/content/legal/terms';

/** Conditions d'utilisation (/terms). */
export default function TermsPage() {
  return <LegalArticle documents={terms} />;
}
