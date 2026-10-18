interface SettingsSwitchProps {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

/** Petit interrupteur accessible, partagé entre les préférences immédiates et le profil. */
export default function SettingsSwitch({ checked, label, onCheckedChange }: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
        checked ? 'bg-jade' : 'bg-foreground/20'
      }`}
    >
      <span
        aria-hidden
        className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
