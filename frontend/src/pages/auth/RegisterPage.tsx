import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/hooks/useAuth';
import { paths } from '@/router/paths';
import { applyServerErrors, getApiErrorMessage } from '@/utils/apiError';
import { registerSchema, type RegisterFormValues } from '@/utils/validators';

export default function RegisterPage() {
  const location = useLocation();
  const registerAccount = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  // Pas de redirection ici : une fois la session ouverte, GuestRoute s'en charge
  const onSubmit = handleSubmit((values) =>
    registerAccount.mutate(values, {
      onError: (error) => {
        if (!applyServerErrors(error, setError)) {
          setError('root', { message: getApiErrorMessage(error) });
        }
      },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Rejoignez la communauté des développeurs africains.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <FormField label="Nom complet" htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" autoFocus aria-invalid={!!errors.fullName} {...register('fullName')} />
          </FormField>
          <FormField
            label="Nom d'utilisateur"
            htmlFor="username"
            error={errors.username?.message}
            hint="Visible dans l'adresse de votre profil. Lettres, chiffres ou _."
          >
            <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message} hint="8 caractères minimum.">
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          </FormField>
          {errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={registerAccount.isPending}>
            {registerAccount.isPending ? 'Création…' : 'Créer mon compte'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link to={paths.login} state={location.state} className="font-medium text-foreground underline">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
