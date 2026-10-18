import { Link2, Share2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import facebook from 'simple-icons/icons/facebook.svg?raw';
import whatsapp from 'simple-icons/icons/whatsapp.svg?raw';
import x from 'simple-icons/icons/x.svg?raw';
import { toast } from 'sonner';
import { LINKEDIN_PATH } from '@/components/shared/LinkedinMark';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

// Logos des réseaux (Simple Icons, licence CC0) ; LinkedIn n'y est plus (shared/LinkedinMark)
const pathOf = (svg: string) => / d="([^"]+)"/.exec(svg)?.[1] ?? '';
const LOGOS = {
  whatsapp: pathOf(whatsapp),
  x: pathOf(x),
  facebook: pathOf(facebook),
  linkedin: LINKEDIN_PATH,
} as const;

/** Les réseaux, et l'adresse qui y partage un lien */
const NETWORKS = [
  { id: 'whatsapp', name: 'WhatsApp', url: (link: string, title: string) => `https://wa.me/?text=${encodeURIComponent(`${title} ${link}`)}` },
  { id: 'x', name: 'X', url: (link: string, title: string) => `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(link)}` },
  { id: 'linkedin', name: 'LinkedIn', url: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { id: 'facebook', name: 'Facebook', url: (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
] as const;

const itemClass =
  'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground';

interface ShareMenuProps {
  /** L'adresse à partager (celle du sujet, ou d'une réponse) */
  url: string;
  title: string;
  /** Le bouton qui ouvre le menu */
  children: ReactNode;
  triggerClassName?: string;
  triggerLabel: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Partager un sujet : copier son lien, le partage du téléphone (quand il existe), WhatsApp d'abord (le réseau le plus
 * utilisé sur le continent), X, LinkedIn, Facebook. Chaque réseau s'ouvre dans un nouvel onglet.
 */
export default function ShareMenu({ url, title, children, triggerClassName, triggerLabel, align = 'start', side = 'bottom' }: ShareMenuProps) {
  const { t } = useTranslation('forum');
  const native = typeof navigator.share === 'function';

  async function copy() {
    if (await copyText(url)) {
      toast.success(t('share.copied'));
    } else {
      toast.error(t('share.copyFailed'));
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={triggerLabel} title={triggerLabel} className={triggerClassName}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-50 w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none',
            'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        >
          <DropdownMenu.Label className="eyebrow px-2.5 pt-1.5 pb-2">{t('share.title')}</DropdownMenu.Label>
          <DropdownMenu.Item className={itemClass} onSelect={() => void copy()}>
            <Link2 aria-hidden className="size-4 text-muted-foreground" />
            {t('share.copy')}
          </DropdownMenu.Item>
          {native && (
            <DropdownMenu.Item className={itemClass} onSelect={() => void navigator.share({ title, url }).catch(() => undefined)}>
              <Share2 aria-hidden className="size-4 text-muted-foreground" />
              {t('share.native')}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
          {NETWORKS.map((network) => (
            <DropdownMenu.Item key={network.id} asChild className={itemClass}>
              <a href={network.url(url, title)} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current text-muted-foreground">
                  <path d={LOGOS[network.id]} />
                </svg>
                {t('share.on', { network: network.name })}
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
