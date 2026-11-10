import { z } from 'zod';
import i18n from '@/i18n';

// Mêmes règles que la validation du backend (RegisterRequest.java, QuestionRequest.java...) :
// le formulaire les signale tout de suite, le serveur reste la référence.

// Messages d'erreur dans la langue de l'interface, pour tous les schémas : la langue est lue
// au moment de la validation, pas au chargement du fichier
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        return issue.input === undefined ? i18n.t('validation.required') : undefined;
      case 'too_small': {
        const count = Number(issue.minimum);
        if (issue.origin === 'array') {
          return i18n.t('validation.minItems', { count });
        }
        if (issue.origin === 'string') {
          return count === 1 ? i18n.t('validation.required') : i18n.t('validation.minChars', { count });
        }
        return undefined;
      }
      case 'too_big': {
        const count = Number(issue.maximum);
        if (issue.origin === 'array') {
          return i18n.t('validation.maxItems', { count });
        }
        return issue.origin === 'string' ? i18n.t('validation.maxChars', { count }) : undefined;
      }
      case 'invalid_format':
        return issue.format === 'email' ? i18n.t('validation.email') : undefined;
      default:
        return undefined;
    }
  },
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/, { error: () => i18n.t('validation.username') }),
  email: z.email(),
  // 72 = longueur maximale prise en compte par BCrypt côté serveur
  password: z.string().min(8).max(72),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

// Un nouveau mot de passe : mêmes règles qu'à l'inscription, et tapé deux fois à l'identique
const newPassword = z.string().min(8).max(72);
const sameTwice = <T extends { confirm: string }>(password: (values: T) => string) => ({
  check: (values: T) => password(values) === values.confirm,
  params: { path: ['confirm'], error: () => i18n.t('validation.passwordMismatch') },
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const resetMatch = sameTwice<{ password: string; confirm: string }>((values) => values.password);
export const resetPasswordSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, { error: () => i18n.t('validation.code') }),
    password: newPassword,
    confirm: z.string().min(1),
  })
  .refine(resetMatch.check, resetMatch.params);
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const changeMatch = sameTwice<{ newPassword: string; confirm: string }>((values) => values.newPassword);
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword,
    confirm: z.string().min(1),
  })
  .refine(changeMatch.check, changeMatch.params);
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Un sujet du forum est une « question » côté backend (QuestionRequest.java)
export const MAX_QUESTION_TAGS = 5;

export const questionSchema = z.object({
  title: z.string().trim().min(10).max(200),
  body: z.string().trim().min(20).max(30000),
  tags: z.array(z.string().trim().min(1).max(50)).min(1).max(MAX_QUESTION_TAGS),
});
export type QuestionFormValues = z.infer<typeof questionSchema>;

export const answerSchema = z.object({
  body: z.string().trim().min(10).max(30000),
});
export type AnswerFormValues = z.infer<typeof answerSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CommentFormValues = z.infer<typeof commentSchema>;
