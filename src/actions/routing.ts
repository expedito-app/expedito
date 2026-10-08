"use server";

import { Type } from "@google/genai";
import { z } from "zod";
import { GEMINI_MODEL, getGemini, isTransient, withRetry } from "@/lib/ai/gemini";
import { getCurrentProfile } from "@/lib/auth";
import { fromDateTimeLocal } from "@/lib/format";
import { loadDayRoutes, suggestForTask } from "@/lib/routes";
import { TRANSPORT_LABEL } from "@/lib/transport";

export type SuggestionReply =
  | { ok: true; memberId: string; memberName: string; reason: string }
  | { ok: false };

const suggestSchema = z.object({
  agencyId: z.uuid(),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

/** Responsável sugerido para a tarefa que o gestor está cadastrando. */
export async function suggestAssigneeFor(input: unknown): Promise<SuggestionReply> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "manager") return { ok: false };
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const suggestion = await suggestForTask({
    agencyId: parsed.data.agencyId,
    dueAtIso: fromDateTimeLocal(parsed.data.dueAt),
  });
  if (!suggestion) return { ok: false };
  return {
    ok: true,
    memberId: suggestion.memberId,
    memberName: suggestion.memberName,
    reason: suggestion.reason,
  };
}

export type RouteReviewReply = { ok: true; tips: string[] } | { ok: false; error: string };

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const tipsSchema = z.object({ dicas: z.array(z.string().min(1).max(400)).min(1).max(6) });

/**
 * A IA revisa as rotas calculadas do dia e sugere ajustes (trocar visitas entre
 * pessoas, antecipar uma retirada, juntar agências próximas). Recebe só nomes de
 * agência, horários e distâncias; nenhum BL.
 */
export async function reviewRoutesWithAi(date: unknown): Promise<RouteReviewReply> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "manager") return { ok: false, error: "Apenas gestores." };
  const parsed = dateSchema.safeParse(date);
  if (!parsed.success) return { ok: false, error: "Dia inválido." };
  const ai = getGemini();
  if (!ai) return { ok: false, error: "IA indisponível: a chave GEMINI_API_KEY não está configurada." };

  const day = await loadDayRoutes(parsed.data);
  const summary = {
    dia: day.date,
    equipe: day.members.map((m) => ({
      nome: m.name,
      transporte: TRANSPORT_LABEL[m.mode],
      km_total: m.plan.totalKm,
      minutos_total: m.plan.totalMin,
      visitas: m.plan.stops.map((s) => ({
        ordem: s.order,
        agencia: s.agencyName,
        chegada_prevista: m.labels[s.taskId]?.eta,
        prazo: m.labels[s.taskId]?.due,
        km_desde_anterior: s.km,
        atrasa: s.late,
      })),
    })),
    sem_responsavel: day.unassigned.map((u) => ({ agencia: u.agencyName, prazo: u.due })),
  };
  if (!summary.equipe.some((m) => m.visitas.length) && !summary.sem_responsavel.length) {
    return { ok: false, error: "Não há visitas abertas nesse dia." };
  }

  const prompt = `Você ajuda um gestor de expedição portuária em Santos a organizar as visitas da equipe às agências de armadores. As rotas abaixo foram calculadas por distância em linha reta (sem trânsito), velocidade média do transporte e 15 min de atendimento por visita.

Dê de 2 a 5 dicas curtas e concretas em português do Brasil para reduzir atrasos e deslocamento: trocar visitas entre pessoas (considerando transporte e carga), juntar agências próximas, antecipar o que tem prazo apertado, atribuir as tarefas sem responsável. Cite nomes e horários do JSON. Não invente dados.

${JSON.stringify(summary)}`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { dicas: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["dicas"],
          },
        },
      }),
    );
    let json: unknown;
    try {
      json = JSON.parse(response.text ?? "");
    } catch {
      return { ok: false, error: "A IA respondeu num formato inesperado. Tente de novo." };
    }
    const tips = tipsSchema.safeParse(json);
    if (!tips.success) return { ok: false, error: "A IA respondeu num formato inesperado. Tente de novo." };
    return { ok: true, tips: tips.data.dicas };
  } catch (error) {
    console.error("Gemini (rotas):", error);
    return {
      ok: false,
      error: isTransient(error)
        ? "A IA está sobrecarregada no momento. Tente de novo em alguns segundos."
        : "Não consegui falar com a IA agora. Tente de novo.",
    };
  }
}
