import { z } from "zod";

// Estado devolvido pelas Server Actions de formulário (useActionState).
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function fromZodError(error: z.ZodError): FormState {
  return {
    error: "Revise os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}
