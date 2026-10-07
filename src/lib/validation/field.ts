import { z } from "zod";
import { TASK_STATUSES } from "./task";

export const OCCURRENCE_TYPES = ["agency_closed", "missing_document", "other"] as const;

export const statusChangeSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(TASK_STATUSES),
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
