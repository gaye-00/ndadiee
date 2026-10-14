import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
}

/** Saisie de tags : Entrée ou virgule pour valider, Retour arrière pour retirer le dernier. */
export default function TagInput({ value, onChange, max, id, placeholder, invalid }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const full = value.length >= max;

  const addDraft = () => {
    const tag = draft.trim().replace(/,+$/, '');
    const alreadyThere = value.some((existing) => existing.toLowerCase() === tag.toLowerCase());
    if (tag && !alreadyThere && !full) {
      onChange([...value, tag]);
    }
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addDraft();
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((existing) => existing !== tag))}
                  aria-label={`Retirer le tag ${tag}`}
                  className="rounded-full hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addDraft}
        disabled={full}
        aria-invalid={invalid}
        placeholder={full ? `${max} tags maximum` : placeholder}
      />
    </div>
  );
}
