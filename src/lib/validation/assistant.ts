import { z } from "zod";
import { TASK_URGENCIES } from "./task";

export const MAX_MESSAGE_LENGTH = 1000;
// O navegador envia só as últimas mensagens; o limite aqui é a defesa do servidor.
export const MAX_HISTORY = 20;

// Histórico enviado pelo navegador a cada pergunta (o servidor não guarda conversa).
export const assistantHistorySchema = z
  .array(
    z.object({
      role: z.enum(["user", "model"]),
      text: z.string().trim().min(1).max(4000),
    }),
  )
  .min(1, { error: "Mensagem vazia." })
  .max(MAX_HISTORY, { error: "Conversa longa demais. Feche e abra o assistente." })
  .refine((h) => h[h.length - 1].role === "user", "A última mensagem deve ser do gestor.")
  .refine(
    (h) => h[h.length - 1].text.length <= MAX_MESSAGE_LENGTH,
    "Mensagem muito longa.",
  );

export type AssistantMessage = z.infer<typeof assistantHistorySchema>[number];

// Argumentos que o Gemini devolve na ferramenta criar_tarefa. Ids são conferidos
// depois contra as agências e a equipe do gestor.
export const draftArgsSchema = z.object({
  agency_id: z.string(),
  document_ref: z.string().trim().min(1).max(60),
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  urgency: z.enum(TASK_URGENCIES).catch("medium"),
  assigned_to: z.string().optional().catch(undefined),
  description: z.string().max(1000).optional().catch(undefined),
});
