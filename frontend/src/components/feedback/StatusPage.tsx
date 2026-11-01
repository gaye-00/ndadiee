import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { StatusMotif } from './statusMotifs';
import Logo from '@/components/layout/Logo';
import WovenMotif, { WovenThreads } from '@/components/shared/WovenMotif';
import { cn } from '@/lib/utils';

interface StatusPageProps {
  /** La figure tissée, fil après fil, à l'arrivée sur la page */
  motifs: readonly StatusMotif[];
  title: string;
  description: string;
  /** Ce qui s'annonce sous la description : l'adresse demandée, le détail d'une erreur */
  detail?: ReactNode;
  actions: ReactNode;
  /** Sous les actions : d'autres points d'où repartir */
  children?: ReactNode;
  /** Hors de toute coquille (erreur à la racine) : la page porte le logo, et son propre repère principal */
  standalone?: boolean;
  /** Où mène le logo */
  home?: string;
  /** Une erreur survenue : les lecteurs d'écran l'annoncent aussitôt */
  alert?: boolean;
}

/**
 * Une page qui ne peut pas montrer ce qu'on attendait : page introuvable, erreur, nouvelle version, hors ligne. Le
 * motif se tisse une fois à l'arrivée, puis tout dit quoi faire ; le texte et les actions restent alignés au début
 * de la ligne, comme le reste de l'application.
 */
export default function StatusPage({ motifs, title, description, detail, actions, children, standalone = false, home, alert = false }: StatusPageProps) {
  const Root = standalone ? 'main' : 'div';

  return (
    <Root className={cn('relative isolate overflow-x-clip', standalone && 'bg-background')}>
      <WovenThreads />
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-coral end-[-18rem] bottom-[-12rem] -z-10 size-[34rem] opacity-50" />

      <div className={cn('mx-auto flex max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-16', standalone ? 'min-h-dvh' : 'min-h-[calc(100dvh-10rem)]')}>
        {standalone && home && (
          <Link to={home} reloadDocument className="mb-12 self-start rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/70">
            <Logo />
          </Link>
        )}

        <div aria-hidden data-weave="in" dir="ltr" className="flex items-end gap-2 self-start sm:gap-3.5">
          {motifs.map((figure, index) => (
            <span key={index} data-weave-in style={{ '--motif-delay': `${index * 240}ms` } as CSSProperties}>
              <WovenMotif motif={figure.motif} colors={figure.colors} className="h-24 w-auto sm:h-36" />
            </span>
          ))}
        </div>

        <div role={alert ? 'alert' : undefined}>
          <h1 className="mt-8 font-display text-h1 text-balance sm:mt-10">{title}</h1>
          <p className="mt-3.5 max-w-xl text-lg leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {detail}

        <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
        {children}
      </div>
    </Root>
  );
}
