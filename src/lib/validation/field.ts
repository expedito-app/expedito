import { z } from "zod";
import { TASK_STATUSES } from "./task";

export const OCCURRENCE_TYPES = ["agency_closed", "missing_document", "other"] as const;

export const statusChangeSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(TASK_STATUSES),
});

// Espelha os checks de task_signatures (migration 20261008000000).
export const SIGNATURE_MAX_LENGTH = 200_000;

export const completionSchema = z.object({
  taskId: z.uuid(),
  signerName: z
    .string()
    .trim()
    .min(1, { error: "Informe quem recebeu." })
    .max(120, { error: "Nome muito longo." }),
  image: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, { error: "Assinatura inválida." })
    .max(SIGNATURE_MAX_LENGTH, { error: "Assinatura muito grande. Limpe e assine de novo." }),
});

export const occurrenceSchema = z
  .object({
    type: z.enum(OCCURRENCE_TYPES, { error: "Escolha o tipo de ocorrência." }),
    note: z
      .string()
      .trim()
      .max(500, { error: "Observação muito longa." })
      .transform((v) => v || null),
  })
  .refine((o) => o.type !== "other" || o.note, {
    error: "Descreva o que aconteceu.",
    path: ["note"],
  });
