/** Lien « Aller au contenu », visible au premier appui sur Tab, vers <main id="main">. */
export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Aller au contenu (SkipLink)
    </a>
  );
}
