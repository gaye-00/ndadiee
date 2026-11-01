import { ArrowUpRight, AtSign, BadgeCheck, CalendarDays, Link2, Mail, MapPin, Save, UserRound } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import CountryField from './CountryField';
import SettingsField, { settingsInputClass, settingsScrollMargins } from './SettingsField';
import SettingsSection from './SettingsSection';
import SettingsSwitch from './SettingsSwitch';
import SkillsField from './SkillsField';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import Chip from '@/components/shared/Chip';
import GithubMark from '@/components/shared/GithubMark';
import LinkedinMark from '@/components/shared/LinkedinMark';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { useUpdateProfile } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { countryFlag, countryName } from '@/utils/formatters';
import { tagSlug } from '@/utils/tags';

interface ProfileDraft {
  fullName: string;
  bio: string;
  city: string;
  country: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  openToWork: boolean;
  skills: string[];
}

const EMPTY_DRAFT: ProfileDraft = {
  fullName: '',
  bio: '',
  city: '',
  country: '',
  githubUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  openToWork: false,
  skills: [],
};

function draftFromUser(user: NonNullable<ReturnType<typeof useAuth>['user']>): ProfileDraft {
  return {
    fullName: user.fullName,
    bio: user.bio ?? '',
    city: user.city ?? '',
    country: user.country ?? '',
    githubUrl: user.githubUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
    websiteUrl: user.websiteUrl ?? '',
    openToWork: user.openToWork ?? false,
    skills: user.skills?.map((skill) => skill.name) ?? [],
  };
}

const BIO_MAX = 1000;
const optionalText = (value: string) => value.trim() || undefined;

// Deux brouillons comparés comme le serveur les voit : les compétences sont un ensemble, sans ordre (HashSet)
const draftKey = (draft: ProfileDraft) => JSON.stringify({ ...draft, skills: draft.skills.map(tagSlug).sort() });
const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Profil public et informations de compte. La carte du haut montre le profil tel qu'il sera, à mesure qu'on
 * tape ; dès qu'un champ change, une barre d'enregistrement monte au bas de l'écran. Le nom d'utilisateur et
 * l'e-mail, liés à la connexion, restent en lecture seule.
 */
export default function AccountSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const profile = useUpdateProfile();
  const { hidden: dockHidden } = useHideOnScroll();
  const [draft, setDraft] = useState(() => (user ? draftFromUser(user) : EMPTY_DRAFT));
  const initialDraft = useMemo(() => (user ? draftFromUser(user) : EMPTY_DRAFT), [user]);
  const isReadOnly = user?.userType !== 'developer';
  const isDirty = !isReadOnly && draftKey(draft) !== draftKey(initialDraft);

  // L'onglet « Mon compte » le signale quand on est passé à un autre onglet
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  if (!user) {
    return null;
  }

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    profile.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function discard() {
    profile.reset();
    setDraft(initialDraft);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDirty || isReadOnly || !user) {
      return;
    }

    profile.mutate(
      {
        fullName: draft.fullName.trim(),
        bio: optionalText(draft.bio),
        country: optionalText(draft.country)?.toUpperCase(),
        city: optionalText(draft.city),
        preferredLanguage: user.preferredLanguage,
        githubUrl: optionalText(draft.githubUrl),
        linkedinUrl: optionalText(draft.linkedinUrl),
        websiteUrl: optionalText(draft.websiteUrl),
        level: user.level ?? undefined,
        openToWork: draft.openToWork,
        skills: draft.skills,
      },
      {
        // Le formulaire reprend le profil tel que le serveur l'a enregistré (espaces retirés, compétences à leur nom
        // de tag) : il n'a plus de modification en attente, la barre d'enregistrement redescend
        onSuccess: (saved) => {
          setDraft(draftFromUser(saved));
          toast.success(t('settingsPage.profileSaved'));
        },
      },
    );
  }

  const memberSince = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));
  const place = [draft.city.trim(), draft.country && `${countryFlag(draft.country)} ${countryName(draft.country)}`]
    .filter(Boolean)
    .join(' · ');
  const showBar = isDirty || profile.isPending || profile.isError;
  const status = profile.isError
    ? t('settingsPage.profileError')
    : profile.isPending
      ? t('settingsPage.profileSaving')
      : isDirty
        ? t('settingsPage.profileDirty')
        : profile.isSuccess
          ? t('settingsPage.profileSaved')
          : '';

  return (
    <SettingsSection
      id="account"
      tone="gold"
      icon={UserRound}
      title={t('settingsPage.accountTitle')}
      description={t('settingsPage.accountDescription')}
      action={
        <Link
          to={paths.profile(user.username)}
          className="group/link inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-subtle px-3 text-sm font-semibold text-soft-foreground outline-none transition-[background-color,border-color,color] duration-300 hover:border-border-strong hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {t('settingsPage.publicProfile')}
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform duration-300 ease-out-expo group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/link:-translate-x-0.5"
          />
        </Link>
      }
    >
      <form onSubmit={saveProfile} className="p-5 sm:p-7">
        {/* La carte du profil, comme les autres membres la verront : elle suit la saisie */}
        <div className="relative isolate overflow-hidden rounded-2xl border border-border-subtle bg-foreground/[0.025] p-4 sm:p-5">
          <span aria-hidden className="hatch absolute inset-0 -z-10 opacity-70" />
          <span aria-hidden className="absolute -end-16 -top-20 -z-10 size-48 rounded-full bg-kente-conic opacity-[0.1] blur-3xl saver:hidden" />
          <div className="flex flex-wrap items-center gap-4">
            <span className="relative shrink-0">
              <span aria-hidden className="profile-ring absolute -inset-[3px] rounded-full" />
              <span className="relative block rounded-full bg-card p-[3px]">
                <UserAvatar user={user} size="lg" className="size-14 text-base" />
              </span>
              <AnimatePresence>
                {draft.openToWork && (
                  <m.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                    className="absolute -end-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-card"
                  >
                    <span aria-hidden className="live-dot size-2.5" />
                  </m.span>
                )}
              </AnimatePresence>
            </span>

            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-display text-base font-semibold tracking-tight">{draft.fullName.trim() || user.fullName}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                <bdi dir="ltr">@{user.username}</bdi>
              </p>
              <AnimatePresence initial={false}>
                {place && (
                  <m.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="flex items-center gap-1.5 overflow-hidden text-xs text-soft-foreground"
                  >
                    <MapPin aria-hidden className="mt-1.5 size-3.5 shrink-0 text-faint-foreground" />
                    <span className="mt-1.5 truncate">{place}</span>
                  </m.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {draft.openToWork && (
                  <m.span
                    key="open"
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <Chip tone="jade">
                      <span aria-hidden className="live-dot size-1.5" />
                      {t('settingsPage.openToWork')}
                    </Chip>
                  </m.span>
                )}
              </AnimatePresence>
              <m.span layout transition={{ duration: 0.3, ease }}>
                <Chip>
                  <CalendarDays aria-hidden className="size-3.5" />
                  {t('settingsPage.memberSince', { date: memberSince })}
                </Chip>
              </m.span>
            </div>
          </div>
        </div>

        {isReadOnly && (
          <p className="mt-5 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {t('settingsPage.accountReadOnly')}
          </p>
        )}

        <fieldset disabled={isReadOnly || profile.isPending} className="mt-6 space-y-7">
          <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
            <SettingsField label={t('settingsPage.fullName')} icon={UserRound}>
              {(control) => (
                <input
                  {...control}
                  autoComplete="name"
                  className={settingsInputClass}
                  dir="auto"
                  maxLength={100}
                  minLength={1}
                  name="fullName"
                  onChange={(event) => updateDraft('fullName', event.target.value)}
                  required
                  value={draft.fullName}
                />
              )}
            </SettingsField>

            <SettingsField label={t('settingsPage.username')} icon={AtSign} locked latin>
              {(control) => <input {...control} className={settingsInputClass} dir="ltr" readOnly value={user.username} />}
            </SettingsField>

            <SettingsField label={t('settingsPage.email')} icon={Mail} locked latin className="sm:col-span-2">
              {(control) => (
                <input {...control} autoComplete="email" className={settingsInputClass} dir="ltr" readOnly type="email" value={user.email} />
              )}
            </SettingsField>

            <SettingsField
              label={t('settingsPage.bio')}
              multiline
              className="sm:col-span-2"
              aside={
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums transition-colors duration-300',
                    draft.bio.length > BIO_MAX * 0.9 ? 'text-gold' : 'text-faint-foreground',
                  )}
                >
                  {draft.bio.length}/{BIO_MAX}
                </span>
              }
            >
              {(control) => (
                <textarea
                  {...control}
                  className={cn(
                    'min-h-32 w-full resize-y bg-transparent px-4 py-3 text-[0.9375rem] leading-relaxed text-foreground outline-none placeholder:text-faint-foreground/80 disabled:cursor-not-allowed',
                    settingsScrollMargins,
                  )}
                  dir="auto"
                  maxLength={BIO_MAX}
                  name="bio"
                  onChange={(event) => updateDraft('bio', event.target.value)}
                  placeholder={t('settingsPage.bioPlaceholder')}
                  rows={4}
                  value={draft.bio}
                />
              )}
            </SettingsField>

            <SettingsField label={t('settingsPage.city')} icon={MapPin}>
              {(control) => (
                <input
                  {...control}
                  autoComplete="address-level2"
                  className={settingsInputClass}
                  dir="auto"
                  maxLength={100}
                  onChange={(event) => updateDraft('city', event.target.value)}
                  value={draft.city}
                />
              )}
            </SettingsField>

            <CountryField value={draft.country} onChange={(country) => updateDraft('country', country)} />
          </div>

          {/* Les compétences font remonter les annonces et les revues qui correspondent (lien : /settings#skills) */}
          <SkillsField value={draft.skills} onChange={(skills) => updateDraft('skills', skills)} />

          <div>
            <div className="mb-5 flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold">{t('settingsPage.socialLinks')}</h3>
              <span aria-hidden className="h-px flex-1 bg-linear-to-r from-border to-transparent rtl:bg-linear-to-l" />
            </div>
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              <SettingsField label={t('settingsPage.github')} icon={GithubMark} invalidHint={t('settingsPage.urlInvalid')} latin>
                {(control) => (
                  <input
                    {...control}
                    autoComplete="url"
                    className={settingsInputClass}
                    dir="ltr"
                    maxLength={500}
                    onChange={(event) => updateDraft('githubUrl', event.target.value)}
                    placeholder="https://github.com/…"
                    type="url"
                    value={draft.githubUrl}
                  />
                )}
              </SettingsField>

              <SettingsField label={t('settingsPage.linkedin')} icon={LinkedinMark} invalidHint={t('settingsPage.urlInvalid')} latin>
                {(control) => (
                  <input
                    {...control}
                    autoComplete="url"
                    className={settingsInputClass}
                    dir="ltr"
                    maxLength={500}
                    onChange={(event) => updateDraft('linkedinUrl', event.target.value)}
                    placeholder="https://linkedin.com/in/…"
                    type="url"
                    value={draft.linkedinUrl}
                  />
                )}
              </SettingsField>

              <SettingsField
                label={t('settingsPage.website')}
                icon={Link2}
                invalidHint={t('settingsPage.urlInvalid')}
                latin
                className="sm:col-span-2"
              >
                {(control) => (
                  <input
                    {...control}
                    autoComplete="url"
                    className={settingsInputClass}
                    dir="ltr"
                    maxLength={500}
                    onChange={(event) => updateDraft('websiteUrl', event.target.value)}
                    placeholder="https://…"
                    type="url"
                    value={draft.websiteUrl}
                  />
                )}
              </SettingsField>
            </div>
          </div>

          {user.userType === 'developer' && (
            <div
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-4 transition-[background-color,border-color] duration-500',
                draft.openToWork ? 'border-jade/30 bg-jade/[0.06]' : 'border-border-subtle',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'hidden size-10 shrink-0 place-items-center rounded-xl transition-colors duration-500 sm:grid',
                  draft.openToWork ? 'bg-jade/15' : 'bg-foreground/6',
                )}
              >
                <span className={cn('size-2.5 rounded-full', draft.openToWork ? 'live-dot' : 'bg-faint-foreground/60')} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('settingsPage.openToWork')}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('settingsPage.openToWorkDescription')}</p>
              </div>
              <SettingsSwitch
                checked={draft.openToWork}
                label={t('settingsPage.openToWork')}
                onCheckedChange={(checked) => updateDraft('openToWork', checked)}
              />
            </div>
          )}
        </fieldset>

        {/* Lu par les lecteurs d'écran : la barre, elle, apparaît et disparaît */}
        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        {/* Enregistrer : la barre monte au bas de l'écran dès qu'un champ change, au-dessus du dock sur téléphone */}
        {!isReadOnly && (
          <div
            data-dock={!dockHidden || undefined}
            className={cn(
              'sticky z-20 mt-6 transition-[bottom] duration-500 ease-out-expo',
              'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] data-dock:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)]',
              'md:bottom-4 md:data-dock:bottom-4',
            )}
          >
            {/* popLayout : la barre remonte tout de suite, sans attendre que « Profil enregistré » ait disparu */}
            <AnimatePresence initial={false} mode="popLayout">
              {showBar ? (
                <m.div
                  key="bar"
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  transition={{ duration: 0.4, ease }}
                  className="flex items-center gap-2 rounded-[1.25rem] border border-border bg-surface/85 p-2 ps-4 shadow-float backdrop-blur-xl saver:bg-surface sm:gap-3"
                >
                  <span
                    aria-hidden
                    className={cn('size-2 shrink-0 rounded-full', profile.isError ? 'bg-coral' : 'animate-pulse bg-gold')}
                  />
                  <p aria-hidden className={cn('min-w-0 flex-1 truncate text-sm', profile.isError ? 'text-coral' : 'text-soft-foreground')}>
                    {status}
                  </p>
                  {isDirty && !profile.isPending && (
                    <button
                      type="button"
                      onClick={discard}
                      className="h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                    >
                      {t('actions.cancel')}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isDirty || profile.isPending || !draft.fullName.trim()}
                    className={cn(
                      'group/save inline-flex h-10 min-w-30 shrink-0 items-center justify-center gap-2 rounded-xl bg-kente-warm px-4 text-sm font-bold text-kente-night',
                      'shadow-[0_10px_24px_-12px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 enabled:hover:-translate-y-px enabled:active:translate-y-0 disabled:opacity-60',
                      'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                    )}
                  >
                    {profile.isPending ? (
                      <PulsatingDots size="sm" tone="current" />
                    ) : (
                      <>
                        <Save aria-hidden className="size-4 transition-transform duration-500 ease-out-expo group-enabled/save:group-hover/save:-rotate-12" />
                        {t('actions.save')}
                      </>
                    )}
                  </button>
                </m.div>
              ) : profile.isSuccess ? (
                <m.p
                  key="saved"
                  aria-hidden
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="flex h-10 items-center gap-1.5 text-sm font-semibold text-jade"
                >
                  <m.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.1 }}>
                    <BadgeCheck aria-hidden className="size-4" />
                  </m.span>
                  {t('settingsPage.profileSaved')}
                </m.p>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </form>
    </SettingsSection>
  );
}
