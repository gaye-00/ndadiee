import { CalendarDays, Check, ExternalLink, Globe, MapPin, Share2, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { m, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProfileAvatar from './ProfileAvatar';
import Chip from '@/components/shared/Chip';
import GithubMark from '@/components/shared/GithubMark';
import LinkedinMark from '@/components/shared/LinkedinMark';
import StackLogo from '@/components/shared/StackLogo';
import { tagLogoOf } from '@/config/stacks';
import { useAuth } from '@/hooks/useAuth';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useFollowUser } from '@/hooks/useUsers';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { UserProfile } from '@/types/user.types';
import { countryFlag, countryName, formatMonth, formatNumber, isolate } from '@/utils/formatters';

// Les éléments de l'en-tête arrivent l'un après l'autre
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const OUTLINE = cn(
  'inline-flex h-11 items-center gap-2 rounded-[0.875rem] border border-border-strong px-3.5 text-sm font-bold text-foreground transition-[background-color,border-color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:border-foreground/30 hover:bg-foreground/5 active:translate-y-0',
  focusRing,
);

/** Une adresse donnée par le membre, si c'en est bien une (http ou https) */
function safeUrl(value: string | null): URL | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Carte d'identité : avatar à anneau, nom, poste, ville, langues, disponibilités, actions. Design 3F.
 *
 * Le nom, le pseudo, ce que la communauté lui reconnaît (réputation, abonnés), sa bio et ses compétences ; où il
 * vit, depuis quand il est là, où le retrouver. On le suit, on partage son profil ; sur le sien, on change sa photo.
 */
export default function ProfileHeader({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const { user } = useAuth();
  const own = user?.id === profile.id;
  const country = countryName(profile.country);
  // Ville et pays isolés : l'ordre suit la langue de la page, pas l'écriture des noms
  const place = profile.city && country ? t('header.place', { city: isolate(profile.city), country: isolate(country) }) : profile.city || country;

  return (
    <section aria-labelledby="profile-title" className="relative px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="-mt-14 sm:-mt-20">
          <ProfileAvatar profile={profile} editable={own} />
        </div>

        <m.div variants={stagger} initial="hidden" animate="shown" className="min-w-0 flex-1 sm:pt-4">
          <m.div variants={rise} className="flex flex-wrap items-center gap-1.5">
            {profile.openToWork && (
              <Chip tone="jade">
                <span aria-hidden className="live-dot size-1.5" />
                {t('header.openToWork')}
              </Chip>
            )}
            {profile.level && <Chip>{tc(`enums.experienceLevel.${profile.level}`)}</Chip>}
            {profile.role === 'MODERATOR' && (
              <Chip tone="gold">
                <ShieldCheck aria-hidden className="size-3" />
                {tc('enums.role.MODERATOR')}
              </Chip>
            )}
          </m.div>
          {/* Le titre suit le sens de la page ; le nom garde le sien (un nom latin dans une page en arabe) */}
          <m.h1 variants={rise} id="profile-title" className="mt-2 font-display text-h2 break-words">
            <bdi>{profile.fullName}</bdi>
          </m.h1>
          {/* Sans séparateurs : la ligne se coupe proprement sur téléphone */}
          <m.p variants={rise} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span dir="ltr" className="font-mono text-soft-foreground">
              @{profile.username}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles aria-hidden className="size-3.5 text-gold" />
              <Tally i18nKey="header.reputation" count={profile.reputation} className="text-gold" />
            </span>
            <Tally i18nKey="header.followers" count={profile.followersCount} />
            <Tally i18nKey="header.following" count={profile.followingCount} />
          </m.p>
        </m.div>

        <div className="flex flex-wrap items-center gap-2 sm:pt-5">
          {!own && <FollowButton profile={profile} />}
          <ShareButton profile={profile} own={own} />
        </div>
      </div>

      <div className="mt-6 grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {profile.bio && (
            <p dir="auto" className="max-w-[44rem] text-start text-[0.9375rem] leading-relaxed whitespace-pre-line text-soft-foreground sm:text-base rtl:text-right">
              {profile.bio}
            </p>
          )}
          {profile.skills.length > 0 && <Skills profile={profile} />}
        </div>

        <ul className="flex flex-col gap-2.5 text-sm text-soft-foreground">
          {place && (
            <Fact icon={<MapPin aria-hidden className="size-4" />}>
              <span>{place}</span>
              {profile.country && <span aria-hidden className="ms-1.5">{countryFlag(profile.country)}</span>}
            </Fact>
          )}
          <Fact icon={<CalendarDays aria-hidden className="size-4" />}>{t('header.memberSince', { date: formatMonth(profile.createdAt) })}</Fact>
          <Links profile={profile} />
        </ul>
      </div>
    </section>
  );
}

/**
 * Un nombre et ce qu'il compte (« 110 points de réputation ») : chaque langue place le nombre où il va (en haoussa
 * ou en swahili, après le nom).
 */
function Tally({ i18nKey, count, className }: { i18nKey: 'header.reputation' | 'header.followers' | 'header.following'; count: number; className?: string }) {
  const { t } = useTranslation('profile');
  return (
    <span>
      <Trans
        t={t}
        i18nKey={i18nKey}
        count={count}
        values={{ value: formatNumber(count) }}
        components={{ n: <strong className={cn('font-mono font-semibold text-foreground', className)} /> }}
      />
    </span>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-4 shrink-0 place-items-center text-faint-foreground">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/** Ses compétences, avec leur logo quand il y en a un ; chacune mène aux projets qui l'utilisent. */
function Skills({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const logos = useStackLogos();

  return (
    <div>
      <h2 className="sr-only">{t('header.skills')}</h2>
      <ul className="flex flex-wrap gap-1.5">
        {profile.skills.map((skill) => {
          const logo = tagLogoOf(skill.slug);
          return (
            <li key={skill.id}>
              <Link
                to={`${paths.showcase}?tag=${encodeURIComponent(skill.slug)}`}
                viewTransition
                className="group/skill inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground/8 px-2.5 text-xs font-semibold text-soft-foreground outline-none transition-[background-color,color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:bg-foreground/12 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                {logo && logos !== false && <StackLogo path={logos?.[logo]} className="size-3 opacity-80 group-hover/skill:opacity-100" />}
                {skill.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Où le retrouver : GitHub, LinkedIn, son site. Seules les adresses web valides s'affichent. */
function Links({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const github = safeUrl(profile.githubUrl);
  const linkedin = safeUrl(profile.linkedinUrl);
  const website = safeUrl(profile.websiteUrl);
  const links = [
    github && { href: github.href, icon: <GithubMark className="size-4" />, label: `${github.hostname}${github.pathname.replace(/\/+$/, '')}`, name: 'GitHub' },
    linkedin && { href: linkedin.href, icon: <LinkedinMark className="size-3.5" />, label: 'LinkedIn', name: 'LinkedIn' },
    website && { href: website.href, icon: <Globe aria-hidden className="size-4" />, label: website.hostname.replace(/^www\./, ''), name: t('header.website') },
  ].filter((link) => !!link);

  return links.map((link) => (
    <li key={link.name} className="min-w-0">
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer me"
        title={link.name}
        className="group/link flex min-w-0 items-center gap-2.5 rounded-md text-soft-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <span className="grid size-4 shrink-0 place-items-center text-faint-foreground transition-colors group-hover/link:text-foreground">{link.icon}</span>
        <span dir="ltr" className="min-w-0 truncate">
          {link.label}
        </span>
        <ExternalLink aria-hidden className="size-3 shrink-0 text-faint-foreground opacity-0 transition-opacity group-hover/link:opacity-100" />
      </a>
    </li>
  ));
}

/**
 * Suivre le membre : le bouton et le nombre d'abonnés changent tout de suite (useFollowUser). Un visiteur passe
 * d'abord par la connexion, puis revient ici ; un compte d'administration ne suit personne.
 */
function FollowButton({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const { isAuthenticated, isDeveloper } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const follow = useFollowUser();
  const following = profile.followedByMe === true;
  const firstName = profile.fullName.split(/\s+/)[0] || profile.username;

  if (isAuthenticated && !isDeveloper) {
    return null;
  }

  function toggle() {
    if (!isAuthenticated) {
      void navigate(paths.login, { state: { from: location } });
      return;
    }
    follow.mutate({ username: profile.username, follow: !following });
  }

  return (
    <button
      type="button"
      aria-pressed={isAuthenticated ? following : undefined}
      onClick={toggle}
      title={following ? t('header.unfollow', { name: firstName }) : undefined}
      className={cn(
        'group/follow relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-[0.875rem] px-4.5 text-sm font-bold transition-[translate,box-shadow,background-color,border-color,color] duration-300 ease-out-expo',
        following
          ? 'border border-jade/40 bg-jade/10 text-jade hover:border-coral/40 hover:bg-coral/8 hover:text-coral'
          : 'bg-kente-warm text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] hover:-translate-y-px hover:shadow-[0_16px_34px_-12px_var(--kente-coral)] active:translate-y-0',
        focusRing,
      )}
    >
      {following ? <Check aria-hidden className="size-4" strokeWidth={3} /> : <UserPlus aria-hidden className="size-4" />}
      {following ? t('header.followingThem') : t('header.follow', { name: firstName })}
    </button>
  );
}

/** Partager le profil : la feuille de partage du téléphone, sinon le lien copié. */
function ShareButton({ profile, own }: { profile: UserProfile; own: boolean }) {
  const { t } = useTranslation('profile');

  async function share() {
    const url = `${window.location.origin}${paths.profile(profile.username)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${profile.fullName} (@${profile.username})`, url });
        return;
      } catch (error) {
        // Partage annulé : rien à dire ; un autre échec se rattrape en copiant le lien
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }
    if (await copyText(url)) {
      toast.success(t('header.linkCopied'));
    } else {
      toast.error(t('header.copyFailed'));
    }
  }

  return (
    <button type="button" onClick={() => void share()} className={OUTLINE}>
      <Share2 aria-hidden className="size-4" />
      {t(own ? 'header.shareMine' : 'header.share')}
    </button>
  );
}
