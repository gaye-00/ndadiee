import { GitPullRequestArrow, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SettingsSection from './SettingsSection';
import SettingsSwitch from './SettingsSwitch';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateEmailPreferences } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

/**
 * Les e-mails que Ndadiee envoie au membre : pour l'instant, ceux des revues de code (un commentaire sur sa PR ou
 * dans une discussion où il a écrit, un verdict, une proposition de relecture, sa revue jugée utile). Le choix
 * s'enregistre dès qu'on bascule l'interrupteur ; les e-mails y mènent (« Gérer mes e-mails » : #review-emails).
 */
export default function EmailSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const update = useUpdateEmailPreferences();

  if (!user) {
    return null;
  }
  // Pendant l'enregistrement, l'interrupteur montre déjà le choix ; une erreur le ramène (le compte n'a pas changé)
  const enabled = update.isPending ? (update.variables ?? user.reviewEmails) : user.reviewEmails;

  const toggle = (next: boolean) =>
    update.mutate(next, {
      onSuccess: () => toast.success(t(next ? 'settingsPage.reviewEmailsOn' : 'settingsPage.reviewEmailsOff')),
    });

  return (
    <SettingsSection
      id="emails"
      tone="coral"
      icon={Mail}
      title={t('settingsPage.emailsTitle')}
      description={t('settingsPage.emailsDescription', { email: user.email })}
    >
      <div id="review-emails" className="scroll-mt-28 p-5 sm:p-7">
        <div
          data-settings-frame
          className={cn(
            'flex items-center gap-4 rounded-2xl border p-4 transition-[background-color,border-color] duration-500',
            enabled ? 'border-jade/30 bg-jade/[0.06]' : 'border-border-subtle',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'hidden size-10 shrink-0 place-items-center rounded-xl transition-colors duration-500 sm:grid',
              enabled ? 'bg-jade/15 text-jade' : 'bg-foreground/6 text-faint-foreground',
            )}
          >
            <GitPullRequestArrow className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('settingsPage.reviewEmails')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('settingsPage.reviewEmailsDescription')}</p>
          </div>
          <SettingsSwitch checked={enabled} label={t('settingsPage.reviewEmails')} onCheckedChange={toggle} />
        </div>
      </div>
    </SettingsSection>
  );
}
