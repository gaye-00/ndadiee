import AccountSettings from '@/components/settings/AccountSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';

/** Réglages : compte, apparence, langue. */
export default function SettingsPage() {
  return (
    <>
      <AccountSettings />
      <AppearanceSettings />
      <LanguageSettings />
    </>
  );
}
