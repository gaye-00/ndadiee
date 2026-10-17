import { ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDataSaverStore } from '@/store/useDataSaverStore';

interface LazyImageProps {
  /** Grande image (1280 px) */
  src: string;
  /** Petite image (640 px) : le navigateur choisit selon la place et l'écran */
  thumbnail?: string | null;
  /** Place de l'image à l'écran, pour ce choix (attribut sizes) */
  sizes?: string;
  alt: string;
  /** Cadre (taille, coins) */
  className?: string;
  /** L'image elle-même (zoom au survol...) */
  imageClassName?: string;
}

/**
 * Image chargée à l'approche de l'écran, avec des hachures en attendant (« capture du projet »), puis
 * un fondu. En mode économie de données, elle attend qu'on la demande.
 */
export default function LazyImage({ src, thumbnail, sizes, alt, className, imageClassName }: LazyImageProps) {
  const { t } = useTranslation();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const [requested, setRequested] = useState(!dataSaver);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className={cn('relative block overflow-hidden hatch', className)}>
      {requested && !failed && (
        <img
          src={thumbnail ?? src}
          srcSet={thumbnail ? `${thumbnail} 640w, ${src} 1280w` : undefined}
          sizes={thumbnail ? sizes : undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          // Déjà dans le cache : pas de fondu à rejouer
          ref={(image) => {
            if (image?.complete && image.naturalWidth > 0) {
              setLoaded(true);
            }
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'size-full object-cover transition-[opacity,scale] duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
        />
      )}
      {!requested && (
        <button
          type="button"
          onClick={() => setRequested(true)}
          className="absolute inset-0 z-10 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset"
        >
          <ImageIcon aria-hidden className="size-4" />
          {t('media.showImage')}
        </button>
      )}
    </span>
  );
}
