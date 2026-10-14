import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/useAuth';
import { paths } from '@/router/paths';
import { applyServerErrors, getApiErrorMessage } from '@/utils/apiError';
import { loginSchema, type LoginFormValues } from '@/utils/validators';

export default function LoginPage() {
  const location = useLocation();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Pas de redirection ici : une fois la session ouverte, GuestRoute renvoie vers la page
  // d'où l'on venait (ou vers le fil)
  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
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
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Content de vous revoir sur Ndadiee.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <FormField label="Email ou nom d'utilisateur" htmlFor="identifier" error={errors.identifier?.message}>
            <Input id="identifier" autoComplete="username" autoFocus aria-invalid={!!errors.identifier} {...register('identifier')} />
          </FormField>
          <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
          </FormField>
          {errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Connexion…' : 'Se connecter'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to={paths.register} state={location.state} className="font-medium text-foreground underline">
              S'inscrire
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
