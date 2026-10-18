import { ArrowUpRight, AtSign, BadgeCheck, CalendarDays, Globe2, LockKeyhole, MapPin, Save, UserRound } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import GithubMark from '@/components/shared/GithubMark';
import UserAvatar from '@/components/shared/UserAvatar';
import SettingsSwitch from '@/components/settings/SettingsSwitch';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfile } from '@/hooks/useUsers';
import { paths } from '@/router/paths';
import { countryFlag, countryName } from '@/utils/formatters';

interface ProfileDraft {
  fullName: string;
  bio: string;
  city: string;
  country: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  openToWork: boolean;
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
  };
}

const INPUT =
  'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-faint-foreground focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60';
const optionalText = (value: string) => value.trim() || undefined;

/** Profil public et informations de compte. Les préférences de connexion restent en lecture seule. */
export default function AccountSettings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const profile = useUpdateProfile();
  const [draft, setDraft] = useState(() => (user ? draftFromUser(user) : EMPTY_DRAFT));
  const initialDraft = useMemo(() => (user ? draftFromUser(user) : EMPTY_DRAFT), [user]);
  const isReadOnly = user?.userType !== 'developer';
  const isDirty = !isReadOnly && JSON.stringify(draft) !== JSON.stringify(initialDraft);

  if (!user) {
    return null;
  }

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    profile.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDirty || isReadOnly) {
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
        skills: user.skills?.map((skill) => skill.name) ?? [],
      },
      { onSuccess: () => toast.success(t('settingsPage.profileSaved')) },
    );
  }

  const memberSince = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt));

  return (
    <section
      id="account"
      aria-labelledby="settings-account-title"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-border-subtle px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
            <UserRound aria-hidden className="size-5" />
          </span>
          <div>
            <h2 id="settings-account-title" className="font-display text-base font-semibold tracking-tight">
              {t('settingsPage.accountTitle')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t('settingsPage.accountDescription')}
            </p>
          </div>
        </div>
        <Link
          to={paths.profile(user.username)}
          className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2.5 text-sm font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 sm:self-center"
        >
          {t('settingsPage.publicProfile')}
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </div>

      <form onSubmit={saveProfile} className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3.5 rounded-xl bg-muted/60 p-4">
          <span className="rounded-full bg-kente-conic p-0.5">
            <UserAvatar user={user} size="lg" className="ring-2 ring-card" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{user.fullName}</p>
            <p dir="ltr" className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              @{user.username}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays aria-hidden className="size-3.5" />
            {t('settingsPage.memberSince', { date: memberSince })}
          </span>
        </div>

        {isReadOnly && (
          <p className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {t('settingsPage.accountReadOnly')}
          </p>
        )}

        <fieldset disabled={isReadOnly || profile.isPending} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">{t('settingsPage.fullName')}</span>
              <input
                autoComplete="name"
                className={INPUT}
                maxLength={100}
                minLength={1}
                name="fullName"
                onChange={(event) => updateDraft('fullName', event.target.value)}
                required
                value={draft.fullName}
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {t('settingsPage.username')}
                <LockKeyhole aria-hidden className="size-3.5 text-faint-foreground" />
              </span>
              <span className="relative block">
                <AtSign aria-hidden className="pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" />
                <input
                  aria-readonly="true"
                  className={`${INPUT} ps-10`}
                  readOnly
                  value={user.username}
                />
              </span>
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {t('settingsPage.email')}
                <LockKeyhole aria-hidden className="size-3.5 text-faint-foreground" />
              </span>
              <input
                autoComplete="email"
                className={INPUT}
                dir="ltr"
                readOnly
                type="email"
                value={user.email}
              />
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {t('settingsPage.bio')}
                <span className="font-mono text-xs font-normal text-faint-foreground">{draft.bio.length}/1000</span>
              </span>
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-faint-foreground focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60"
                maxLength={1000}
                name="bio"
                onChange={(event) => updateDraft('bio', event.target.value)}
                rows={4}
                value={draft.bio}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">{t('settingsPage.city')}</span>
              <span className="relative block">
                <MapPin aria-hidden className="pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" />
                <input
                  autoComplete="address-level2"
                  className={`${INPUT} ps-10`}
                  maxLength={100}
                  onChange={(event) => updateDraft('city', event.target.value)}
                  value={draft.city}
                />
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">{t('settingsPage.country')}</span>
              <span className="relative block">
                <Globe2 aria-hidden className="pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" />
                <input
                  autoCapitalize="characters"
                  autoComplete="country"
                  className={`${INPUT} ps-10 uppercase`}
                  dir="ltr"
                  maxLength={2}
                  onChange={(event) => updateDraft('country', event.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
                  placeholder="SN"
                  value={draft.country}
                />
              </span>
              {draft.country.length === 2 && (
                <span className="block text-xs text-muted-foreground">
                  {countryFlag(draft.country)} {countryName(draft.country)}
                </span>
              )}
              <span className="block text-xs text-faint-foreground">{t('settingsPage.countryHint')}</span>
            </label>
          </div>

          <div className="border-t border-border-subtle pt-5">
            <h3 className="mb-4 text-sm font-semibold">{t('settingsPage.socialLinks')}</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">{t('settingsPage.github')}</span>
                <span className="relative block">
                  <GithubMark className="pointer-events-none absolute inset-s-3.5 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" />
                  <input
                    autoComplete="url"
                    className={`${INPUT} ps-10`}
                    maxLength={500}
                    onChange={(event) => updateDraft('githubUrl', event.target.value)}
                    placeholder="https://github.com/…"
                    type="url"
                    value={draft.githubUrl}
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">{t('settingsPage.linkedin')}</span>
                <input
                  autoComplete="url"
                  className={INPUT}
                  maxLength={500}
                  onChange={(event) => updateDraft('linkedinUrl', event.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  type="url"
                  value={draft.linkedinUrl}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">{t('settingsPage.website')}</span>
                <input
                  autoComplete="url"
                  className={INPUT}
                  maxLength={500}
                  onChange={(event) => updateDraft('websiteUrl', event.target.value)}
                  placeholder="https://…"
                  type="url"
                  value={draft.websiteUrl}
                />
              </label>
            </div>
          </div>

          {user.userType === 'developer' && (
            <div className="flex flex-col gap-3 rounded-xl border border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
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

        <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="min-h-5 text-sm">
            {profile.isError ? (
              <span role="alert" className="text-destructive">
                {t('settingsPage.profileError')}
              </span>
            ) : profile.isPending ? (
              <span className="text-muted-foreground">{t('settingsPage.profileSaving')}</span>
            ) : isDirty ? (
              <span className="text-gold">{t('settingsPage.profileDirty')}</span>
            ) : profile.isSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-jade">
                <BadgeCheck aria-hidden className="size-4" />
                {t('settingsPage.profileSaved')}
              </span>
            ) : null}
          </p>

          <div className="flex items-center gap-3 sm:justify-end">
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  profile.reset();
                  setDraft(initialDraft);
                }}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                {t('actions.cancel')}
              </button>
            )}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={!isDirty || profile.isPending || !draft.fullName.trim()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save aria-hidden className="size-4" />
                {profile.isPending ? t('settingsPage.profileSaving') : t('actions.save')}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
