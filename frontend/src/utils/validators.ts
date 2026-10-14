import { z } from 'zod';

// Mêmes règles que la validation du backend (RegisterRequest.java, QuestionRequest.java...) :
// le formulaire les signale tout de suite, le serveur reste la référence.

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "L'identifiant est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Le nom complet est requis').max(100, '100 caractères maximum'),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/, '3 à 30 caractères : lettres, chiffres ou _'),
  email: z.email("L'email n'est pas valide"),
  // 72 = longueur maximale prise en compte par BCrypt côté serveur
  password: z.string().min(8, '8 caractères minimum').max(72, '72 caractères maximum'),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const MAX_QUESTION_TAGS = 5;

export const questionSchema = z.object({
  title: z.string().trim().min(10, '10 caractères minimum').max(200, '200 caractères maximum'),
  body: z.string().trim().min(20, '20 caractères minimum').max(30000, '30 000 caractères maximum'),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .min(1, 'Ajoutez au moins un tag')
    .max(MAX_QUESTION_TAGS, `${MAX_QUESTION_TAGS} tags maximum`),
});
export type QuestionFormValues = z.infer<typeof questionSchema>;

export const answerSchema = z.object({
  body: z.string().trim().min(10, '10 caractères minimum').max(30000, '30 000 caractères maximum'),
});
export type AnswerFormValues = z.infer<typeof answerSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Le commentaire est vide').max(2000, '2 000 caractères maximum'),
});
export type CommentFormValues = z.infer<typeof commentSchema>;
