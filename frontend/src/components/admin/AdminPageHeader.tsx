import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  lead?: string;
  /** À droite sur grand écran, dessous sur téléphone (le compteur des résultats, une action) */
  children?: ReactNode;
}

/** L'en-tête d'une page du back-office : le sur-titre, le titre, ce qu'on y fait. */
export default function AdminPageHeader({ eyebrow, title, lead, children }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 pt-7 pb-7 lg:flex-row lg:items-end lg:justify-between lg:pt-12 lg:pb-9">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-h2">{title}</h1>
        {lead && <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </header>
  );
}
