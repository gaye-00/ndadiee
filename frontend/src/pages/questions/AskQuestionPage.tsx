import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import FormField from '@/components/shared/FormField';
import MarkdownEditor from '@/components/shared/MarkdownEditor';
import PageHeader from '@/components/shared/PageHeader';
import TagInput from '@/components/shared/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCreateQuestion } from '@/hooks/useQuestions';
import { paths } from '@/router/paths';
import { applyServerErrors, getApiErrorMessage } from '@/utils/apiError';
import { MAX_QUESTION_TAGS, questionSchema, type QuestionFormValues } from '@/utils/validators';

export default function AskQuestionPage() {
  const { isDeveloper } = useAuth();
  const navigate = useNavigate();
  const createQuestion = useCreateQuestion();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: { title: '', body: '', tags: [] },
  });

  if (!isDeveloper) {
    return (
      <>
        <PageHeader title="Poser une question" />
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Un compte administrateur ne peut pas publier de question.
        </p>
      </>
    );
  }

  const onSubmit = handleSubmit((values) =>
    createQuestion.mutate(values, {
      onSuccess: (question) => void navigate(paths.question(question.slug)),
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          setError('root', { message: getApiErrorMessage(error) });
        }
      },
    }),
  );

  return (
    <>
      <PageHeader
        title="Poser une question"
        description="Un titre précis et un exemple de code augmentent vos chances d'obtenir une bonne réponse."
      />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField
          label="Titre"
          htmlFor="question-title"
          error={errors.title?.message}
          hint="Résumez le problème en une phrase, comme si vous le demandiez à un collègue."
        >
          <Input
            id="question-title"
            {...register('title')}
            aria-invalid={!!errors.title}
            placeholder="Ex. : Comment paginer une requête avec Spring Data JPA ?"
          />
        </FormField>

        <FormField label="Détails" htmlFor="question-body" error={errors.body?.message}>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <MarkdownEditor
                id="question-body"
                value={field.value}
                onChange={field.onChange}
                rows={12}
                invalid={!!errors.body}
                placeholder="Ce que vous cherchez à faire, ce que vous avez essayé, et ce qui se passe à la place."
              />
            )}
          />
        </FormField>

        <FormField
          label="Tags"
          htmlFor="question-tags"
          error={errors.tags?.message}
          hint={`De 1 à ${MAX_QUESTION_TAGS} technologies ou sujets. Entrée ou virgule pour valider.`}
        >
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                id="question-tags"
                value={field.value}
                onChange={field.onChange}
                max={MAX_QUESTION_TAGS}
                invalid={!!errors.tags}
                placeholder="java, spring-boot…"
              />
            )}
          />
        </FormField>

        {errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={createQuestion.isPending}>
          {createQuestion.isPending ? 'Publication…' : 'Publier la question'}
        </Button>
      </form>
    </>
  );
}
