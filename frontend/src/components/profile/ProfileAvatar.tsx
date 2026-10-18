import { Camera, ImageUp, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AvatarEditorDialog from './AvatarEditorDialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import UserAvatar from '@/components/shared/UserAvatar';
import { useDeleteAvatar } from '@/hooks/useUsers';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/user.types';
import { getApiErrorMessage } from '@/utils/apiError';

// La photo du profil : la plus grande de l'application
const FACE = 'size-28 text-[2rem] sm:size-36 sm:text-[2.5rem]';

const ITEM =
  'flex h-10 cursor-default items-center gap-3 rounded-xl ps-2.5 pe-3 text-sm font-medium text-soft-foreground outline-none select-none data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';

interface ProfileAvatarProps {
  profile: UserProfile;
  /** Le profil du membre connecté : il change ou retire sa photo d'ici */
  editable: boolean;
}

/**
 * La photo du profil, dans un anneau kente qui tourne doucement ; un point vert qui bat quand le membre est
 * disponible. Sur son propre profil, le membre la change d'un clic (ou en y déposant une photo), ou la retire.
 */
export default function ProfileAvatar({ profile, editable }: ProfileAvatarProps) {
  const { t } = useTranslation('profile');

  return (
    <div className="relative w-fit shrink-0">
      <span aria-hidden className="profile-ring absolute -inset-1 rounded-full" />
      <span className="relative block rounded-full bg-background p-1">
        {editable ? <AvatarControl profile={profile} /> : <UserAvatar user={profile} className={FACE} />}
      </span>
      {profile.openToWork && (
        <span
          title={t('header.openToWork')}
          className="pointer-events-none absolute end-1.5 bottom-1.5 grid size-6 place-items-center rounded-full bg-background sm:end-2.5 sm:bottom-2.5"
        >
          <span aria-hidden className="live-dot size-3" />
          <span className="sr-only">{t('header.openToWork')}</span>
        </span>
      )}
    </div>
  );
}

/** La photo cliquable du membre sur son profil, et ce qu'elle ouvre : le choix d'une photo, le cadrage, le retrait. */
function AvatarControl({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dropping, setDropping] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteAvatar();
  const pick = () => input.current?.click();

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDropping(true);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropping(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
    }
  }

  function removePhoto() {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.success(t('avatar.removed'));
      },
      onError: (error) => toast.error(getApiErrorMessage(error, t('avatar.removeFailed'))),
    });
  }

  const trigger =
    'group/avatar relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-4 focus-visible:ring-offset-background';
  const face = (
    <>
      <UserAvatar user={profile} className={FACE} />
      {/* Au survol, au focus ou quand une photo arrive dessus : ce que fait le clic */}
      <span
        data-dropping={dropping || undefined}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-kente-night/60 text-kente-paper opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100 data-[dropping]:opacity-100 saver:transition-none"
      >
        <Camera aria-hidden className="size-6" />
        <span className="text-xs font-bold">{t(dropping ? 'avatar.drop' : profile.avatarUrl ? 'avatar.change' : 'avatar.add')}</span>
      </span>
      {/* Toujours là, pour les écrans tactiles : on voit que la photo se change */}
      <span aria-hidden className="absolute start-0.5 bottom-0.5 grid size-9 place-items-center rounded-full bg-foreground text-background ring-4 ring-background transition-transform duration-300 ease-out-expo group-hover/avatar:scale-110 sm:start-1.5 sm:bottom-1.5">
        <Camera className="size-4" />
      </span>
    </>
  );

  return (
    <div onDragOver={onDragOver} onDragLeave={() => setDropping(false)} onDrop={onDrop}>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          // Remis à zéro : la même photo peut être choisie à nouveau
          event.target.value = '';
          if (chosen) {
            setFile(chosen);
          }
        }}
      />

      {profile.avatarUrl ? (
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger aria-label={t('avatar.menu')} className={trigger}>
            {face}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="start"
              sideOffset={10}
              collisionPadding={12}
              className="z-50 min-w-52 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            >
              <MenuItem icon={<ImageUp aria-hidden />} onSelect={pick}>
                {t('avatar.change')}
              </MenuItem>
              <MenuItem icon={<Trash2 aria-hidden />} onSelect={() => setConfirming(true)} className="text-coral data-[highlighted]:bg-coral/10 data-[highlighted]:text-coral">
                {t('avatar.remove')}
              </MenuItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        <button type="button" onClick={pick} aria-label={t('avatar.add')} className={trigger}>
          {face}
        </button>
      )}

      <AvatarEditorDialog file={file} onClose={() => setFile(null)} onPickAnother={pick} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('avatar.removeTitle')}
        description={t('avatar.removeText')}
        confirmLabel={t('avatar.remove')}
        destructive
        pending={remove.isPending}
        onConfirm={removePhoto}
      />
    </div>
  );
}

function MenuItem({ icon, onSelect, className, children }: { icon: ReactNode; onSelect: () => void; className?: string; children: ReactNode }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={cn(ITEM, className)}>
      {icon}
      <span className="flex-1">{children}</span>
    </DropdownMenu.Item>
  );
}
