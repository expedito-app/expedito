import { z } from "zod";

// Estado devolvido pelas Server Actions de formulário (useActionState).
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Valores enviados, para o formulário não perder o que foi digitado no erro.
  values?: Record<string, string>;
};

export function fromZodError(
  error: z.ZodError,
  values?: Record<string, string>,
): FormState {
  return {
    error: "Revise os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  };
}

/** Lê os campos de texto do FormData (ausente vira ""), para o Zod validar. */
export function readForm<K extends string>(
  formData: FormData,
  keys: readonly K[],
): Record<K, string> {
  const entries = keys.map((key) => {
    const value = formData.get(key);
    return [key, typeof value === "string" ? value : ""] as const;
  });
  return Object.fromEntries(entries) as Record<K, string>;
}

/** Texto opcional: espaços aparados, vazio vira null. */
export const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((value) => value || null);

export const uuidSchema = z.uuid();
