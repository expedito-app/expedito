import { z } from "zod";
import { fromDateTimeLocal } from "@/lib/format";
import { optionalText } from "./form-state";

export const TASK_STATUSES = ["pending", "in_progress", "done", "problem"] as const;
export const TASK_URGENCIES = ["low", "medium", "high"] as const;

export const TASK_FIELDS = [
  "agencyId",
  "documentRef",
  "description",
  "urgency",
  "dueAt",
  "assignedTo",
  "status",
] as const;

export const taskSchema = z.object({
  agencyId: z.uuid({ error: "Escolha a agência." }),
  documentRef: z
    .string()
    .trim()
    .min(1, { error: "Informe o BL ou documento." })
    .max(60, { error: "Identificador muito longo." }),
  description: optionalText(1000, "Texto muito longo."),
  urgency: z.enum(TASK_URGENCIES, { error: "Escolha a urgência." }),
  // <input type="datetime-local"> no fuso de São Paulo → ISO UTC
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "Informe o prazo." })
    .transform(fromDateTimeLocal),
  assignedTo: z.union([
    z.literal("").transform(() => null),
    z.uuid({ error: "Responsável inválido." }),
  ]),
  status: z.enum(TASK_STATUSES, { error: "Escolha o status." }),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const taskStatusFilter = z.enum(TASK_STATUSES).optional().catch(undefined);

/** Busca por BL/documento na lista de tarefas (?q=). Inválido vira "sem busca". */
export const taskSearchFilter = z
  .string()
  .trim()
  .max(60)
  .transform((v) => v || undefined)
  .optional()
  .catch(undefined);
