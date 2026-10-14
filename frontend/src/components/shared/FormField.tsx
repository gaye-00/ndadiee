import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  /** id du champ contenu, pour lier le libellé */
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Un champ de formulaire : libellé, contrôle, puis message d'erreur ou aide. */
export default function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
