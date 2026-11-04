import { CircleCheck, MessagesSquare } from 'lucide-react';
import LazyImage from '@/components/shared/LazyImage';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import type { SearchHit } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

const tile = 'grid size-9 shrink-0 place-items-center rounded-xl bg-foreground/5';

/** Ce qui fait reconnaître un résultat : le motif du rôle, la miniature du projet, le visage, l'état du sujet. */
export default function SearchHitVisual({ hit }: { hit: SearchHit }) {
  switch (hit.group) {
    case 'roles': {
      const role = roleOf(hit.opening.role);
      return <span aria-hidden className={tile}>{role && <WovenMotif motif={role.motif} colors={role.colors} className="h-5 w-auto" />}</span>;
    }
    case 'projects':
      return hit.project.coverThumbnailUrl ? (
        <LazyImage src={hit.project.coverThumbnailUrl} alt="" className="size-9 shrink-0 rounded-xl" imageClassName="object-cover" />
      ) : (
        <span aria-hidden className="size-9 shrink-0 rounded-xl bg-kente-conic opacity-85" />
      );
    case 'people':
      return <UserAvatar user={hit.user} size="md" />;
    case 'topics':
      return (
        <span aria-hidden className={cn(tile, hit.topic.hasAcceptedAnswer ? 'bg-jade/12 text-jade' : 'text-muted-foreground')}>
          {hit.topic.hasAcceptedAnswer ? <CircleCheck className="size-4.5" /> : <MessagesSquare className="size-4.5" />}
        </span>
      );
  }
}
