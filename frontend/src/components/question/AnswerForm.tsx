import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import FormField from '@/components/shared/FormField';
import MarkdownEditor from '@/components/shared/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreateAnswer } from '@/hooks/useQuestions';
import { paths } from '@/router/paths';
import type { Question } from '@/types/question.types';
import { applyServerErrors, getApiErrorMessage } from '@/utils/apiError';
import { answerSchema, type AnswerFormValues } from '@/utils/validators';

interface AnswerFormProps {
  question: Question;
}

export default function AnswerForm({ question }: AnswerFormProps) {
  const { isAuthenticated, isDeveloper } = useAuth();
  const location = useLocation();
  const createAnswer = useCreateAnswer(question);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AnswerFormValues>({ resolver: zodResolver(answerSchema), defaultValues: { body: '' } });

  if (question.status === 'CLOSED') {
    return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Cette question est fermée : elle n'accepte plus de réponses.</p>;
  }
  if (!isAuthenticated) {
    return (
      <p className="rounded-lg border p-4 text-sm">
        <Link to={paths.login} state={{ from: location }} className="font-medium underline">
          Connectez-vous
        </Link>{' '}
        pour répondre à cette question.
      </p>
    );
  }
  if (!isDeveloper) {
    return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Un compte administrateur ne peut pas publier de réponse.</p>;
  }

  const onSubmit = handleSubmit((values) =>
    createAnswer.mutate(values.body, {
      onSuccess: () => reset(),
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          setError('body', { message: getApiErrorMessage(error) });
        }
      },
    }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <FormField label="Votre réponse" htmlFor="answer-body" error={errors.body?.message}>
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <MarkdownEditor
              id="answer-body"
              value={field.value}
              onChange={field.onChange}
              rows={8}
              invalid={!!errors.body}
              placeholder="Expliquez votre solution, avec du code si besoin."
            />
          )}
        />
      </FormField>
      <Button type="submit" disabled={createAnswer.isPending}>
        {createAnswer.isPending ? 'Publication…' : 'Publier la réponse'}
      </Button>
    </form>
  );
}
