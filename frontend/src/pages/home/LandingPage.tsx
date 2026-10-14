import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { NAV_ITEMS } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { paths } from '@/router/paths';

const FEATURES: Record<string, string> = {
  [paths.feed]: "Un fil à votre image : les auteurs et les technologies que vous suivez, d'abord.",
  [paths.questions]: 'Posez vos questions techniques et obtenez des réponses de développeurs du continent.',
  [paths.articles]: "Partagez votre expérience : tutoriels, retours de terrain, parcours, en français ou en anglais.",
  [paths.projects]: 'Présentez vos projets open source et trouvez des contributeurs.',
  [paths.opportunities]: 'Emplois, missions freelance, stages et hackathons, partout en Afrique.',
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            La plateforme d'échange africaine, pour les devs, par les devs
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
            Posez vos questions, partagez ce que vous savez, montrez vos projets et trouvez votre prochaine
            opportunité, avec des développeurs de tout le continent.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!isAuthenticated && (
              <Button size="lg" asChild>
                <Link to={paths.register}>
                  Rejoindre la communauté <ArrowRight />
                </Link>
              </Button>
            )}
            <Button size="lg" variant={isAuthenticated ? 'default' : 'outline'} asChild>
              <Link to={paths.feed}>Explorer le fil</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20" aria-label="Ce que propose Ndadiee">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="block h-full rounded-lg border p-5 transition-colors hover:bg-muted/50">
                  <item.icon className="size-5" />
                  <h2 className="mt-3 font-semibold">{item.label}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{FEATURES[item.to]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
