import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const password = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(72, { error: "A senha pode ter no máximo 72 caracteres." });

const fullName = z
  .string()
  .trim()
  .min(2, { error: "Informe o nome completo." })
  .max(120, { error: "Nome muito longo." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Informe a senha." }),
});

export const changePasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const fieldUserSchema = z.object({ fullName, email, password });
