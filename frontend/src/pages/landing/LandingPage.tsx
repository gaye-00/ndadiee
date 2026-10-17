import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { communityStatsQuery } from '@/hooks/useCommunityStats';
import { openingRoleSummaryQuery, openingStackSummaryQuery } from '@/hooks/useOpenings';
import { projectsQuery, SHOWCASE_FILTERS } from '@/hooks/useProjects';

// Sous l'accroche : la bande des rôles, la vitrine, les usages et la bannière finale arrivent dans des
// fichiers à part, pendant que l'accroche s'affiche
const RolesMarquee = lazy(() => import('@/components/landing/RolesMarquee'));
const ShowcasePreview = lazy(() => import('@/components/landing/ShowcasePreview'));
const FeatureBento = lazy(() => import('@/components/landing/FeatureBento'));
const CtaBanner = lazy(() => import('@/components/landing/CtaBanner'));

/** Accueil du visiteur : accroche, rôles recherchés, vitrine, usages, appel à rejoindre. Design 3A. */
export default function LandingPage() {
  const queryClient = useQueryClient();

  // Leurs données partent tout de suite, en même temps que leur code
  useEffect(() => {
    void queryClient.prefetchQuery(openingRoleSummaryQuery);
    void queryClient.prefetchQuery(projectsQuery(SHOWCASE_FILTERS));
    void queryClient.prefetchQuery(communityStatsQuery);
    void queryClient.prefetchQuery(openingStackSummaryQuery);
  }, [queryClient]);

  return (
    <>
      {/* Dégradés des fils des motifs tissés (bande des rôles, vitrine), une fois pour la page */}
      <WovenThreads />
      <HeroSection />
      <Suspense fallback={<RolesMarqueePlaceholder />}>
        <RolesMarquee />
      </Suspense>
      <Suspense fallback={<ShowcasePlaceholder />}>
        <ShowcasePreview />
      </Suspense>
      <Suspense fallback={<div aria-hidden className="min-h-svh" />}>
        <FeatureBento />
      </Suspense>
      <Suspense fallback={<div aria-hidden className="min-h-svh" />}>
        <CtaBanner />
      </Suspense>
    </>
  );
}

/** Même encombrement que la bande, sans contenu : rien ne bouge quand elle arrive. */
function RolesMarqueePlaceholder() {
  return (
    <div aria-hidden className="pt-2 pb-16 lg:pb-24">
      <div className="h-8" />
      <div className="role-ribbon mt-4 h-24 border-y border-border-subtle lg:h-28" />
    </div>
  );
}

/** Le titre et la place des cartes, le temps que la vitrine arrive : une rangée sur téléphone, deux ailleurs. */
function ShowcasePlaceholder() {
  return (
    <div aria-hidden className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:pb-24">
      <div className="h-10" />
      <div className="mt-6 h-[27.8rem] md:h-[53.5rem]" />
    </div>
  );
}
