import MarkdownContent from './MarkdownContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
}

/** Zone de saisie Markdown avec un onglet d'aperçu. Composant contrôlé (compatible React Hook Form). */
export default function MarkdownEditor({ value, onChange, id, placeholder, rows = 10, invalid }: MarkdownEditorProps) {
  return (
    <Tabs defaultValue="write">
      <TabsList>
        <TabsTrigger value="write">Écrire</TabsTrigger>
        <TabsTrigger value="preview">Aperçu</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          aria-invalid={invalid}
          className="font-mono text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Markdown accepté : **gras**, `code`, listes, et blocs de code entre ```.
        </p>
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-32 rounded-lg border p-4">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Rien à prévisualiser pour l'instant.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
