"use server";

import { Type } from "@google/genai";
import { z } from "zod";
import { GEMINI_MODEL, getGemini, isTransient, withRetry } from "@/lib/ai/gemini";
import { getCurrentProfile } from "@/lib/auth";
import { loadInsights } from "@/lib/insights";
import { resolvePeriod } from "@/lib/period";

export type Insight = {
  kind: "alert" | "trend" | "action";
  title: string;
  detail: string;
};

export type InsightsReply =
  | { ok: true; insights: Insight[] }
  | { ok: false; error: string };

const paramsSchema = z.object({
  periodo: z.string().max(10).optional(),
  de: z.string().max(10).optional(),
  ate: z.string().max(10).optional(),
});

const replySchema = z.object({
  insights: z
    .array(
      z.object({
        tipo: z.enum(["alerta", "tendencia", "acao"]),
        titulo: z.string().min(1).max(140),
        detalhe: z.string().min(1).max(600),
      }),
    )
    .min(1)
    .max(8),
});

const KIND = { alerta: "alert", tendencia: "trend", acao: "action" } as const;

const pct = (v: number | null) => (v === null ? null : Math.round(v * 100));
const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

/**
 * Gera análises do período com o Gemini. O período é recalculado aqui (não
 * confiamos em números vindos do navegador) e a IA recebe só agregados:
 * nenhum número de BL ou descrição de tarefa sai do servidor.
 */
export async function generateInsights(params: unknown): Promise<InsightsReply> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "manager") {
    return { ok: false, error: "Apenas gestores podem gerar análises." };
  }
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Período inválido." };

  const ai = getGemini();
  if (!ai) {
    return { ok: false, error: "IA indisponível: a chave GEMINI_API_KEY não está configurada." };
  }

  const data = await loadInsights(resolvePeriod(parsed.data, new Date()));
  if (!data.totals.total) {
    return { ok: false, error: "Não há tarefas no período para analisar." };
  }

  const summary = {
    periodo: data.period.label,
    dias: data.period.days,
    granularidade: data.granularity,
    totais: {
      tarefas: data.totals.total,
      concluidas: data.totals.done,
      no_prazo: data.totals.onTime,
      concluidas_com_atraso: data.totals.lateDone,
      vencidas_em_aberto: data.totals.lateOpen,
      pontualidade_pct: pct(data.totals.onTimeRate),
      atraso_medio_h: round1(data.totals.avgDelayHours),
      ciclo_medio_h: round1(data.totals.avgCycleHours),
      ocorrencias: data.totals.occurrences,
    },
    periodo_anterior: {
      tarefas: data.previous.total,
      pontualidade_pct: pct(data.previous.onTimeRate),
      ocorrencias: data.previous.occurrences,
    },
    serie: data.series.map((b) => ({
      periodo: b.label,
      total: b.onTime + b.late + b.open,
      atrasou: b.late,
    })),
    equipe: {
      tamanho: data.forecast.teamSize,
      pessoas: data.members.map((m) => ({
        nome: m.name,
        tarefas: m.total,
        atrasou: m.late,
        pontualidade_pct: pct(m.onTimeRate),
        media_por_dia_ativo: round1(m.perActiveDay),
      })),
    },
    agencias: data.agencies.slice(0, 10).map((a) => ({
      nome: a.name,
      tarefas: a.total,
      atrasou: a.late,
      ocorrencias: a.occurrences,
      agencia_fechada: a.byType.agency_closed,
      faltou_documento: a.byType.missing_document,
    })),
    prazos_por_dia_e_hora: data.heatmap.cells
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((c) => ({ dia_semana: c.weekday, hora: c.hour, prazos: c.count })),
    proximos_7_dias: data.forecast.days.map((d) => ({
      dia: d.label,
      tarefas: d.count,
      acima_do_normal: d.aboveNormal,
    })),
    media_diaria_normal: round1(data.forecast.normalDaily),
    demurrage_evitado: {
      premissas: {
        diaria_por_conteiner_brl: data.demurrage.settings.dailyBrl,
        conteineres_por_bl: data.demurrage.settings.containersPerBl,
        dias_por_atraso: data.demurrage.settings.daysPerDelay,
        taxa_atraso_antes_do_expedito_pct: pct(data.demurrage.settings.baselineLateRate),
      },
      taxa_atraso_atual_pct: pct(data.demurrage.period.currentRate),
      atrasos_evitados: round1(data.demurrage.period.avoided),
      economia_estimada_brl: Math.round(data.demurrage.period.savedBrl),
      ainda_perdido_brl: Math.round(data.demurrage.period.lostBrl),
      economia_periodo_anterior_brl: Math.round(data.demurrage.previous.savedBrl),
    },
  };

  const prompt = `Você é um analista de operações de uma empresa de logística portuária. O gestor de expedição acompanha tarefas externas (retirar/entregar BL e outros documentos em agências de armadores). Atrasos geram custos de armazenagem e demurrage.

Analise os indicadores abaixo (JSON) e escreva de 3 a 6 análises curtas e acionáveis em português do Brasil:
- "alerta": gargalos e riscos (ex.: pessoa sobrecarregada, agência que concentra atrasos ou "agência fechada", dias acima do normal na próxima semana).
- "tendencia": padrões e sazonalidade (ex.: meses ou dias da semana com alta de tarefas, piora ou melhora da pontualidade vs. período anterior; se a demanda de pico excede o que a equipe atual entrega).
- "acao": plano de ação preventivo ou corretivo concreto (redistribuir tarefas, antecipar retiradas, conferir documentos antes de sair, reforçar equipe em certo mês).
Inclua uma análise sobre o demurrage evitado (economia estimada em R$, atrasos evitados e comparação com a taxa de atraso antes do Expedito), deixando claro que é estimativa pelas premissas do gestor. Cite números do JSON. Não invente dados que não estão nele. Dias da semana: 0=domingo … 6=sábado.

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
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tipo: { type: Type.STRING, enum: ["alerta", "tendencia", "acao"] },
                    titulo: { type: Type.STRING },
                    detalhe: { type: Type.STRING },
                  },
                  required: ["tipo", "titulo", "detalhe"],
                },
              },
            },
            required: ["insights"],
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
    const reply = replySchema.safeParse(json);
    if (!reply.success) {
      return { ok: false, error: "A IA respondeu num formato inesperado. Tente de novo." };
    }
    return {
      ok: true,
      insights: reply.data.insights.map((i) => ({
        kind: KIND[i.tipo],
        title: i.titulo,
        detail: i.detalhe,
      })),
    };
  } catch (error) {
    console.error("Gemini (indicadores):", error);
    return {
      ok: false,
      error: isTransient(error)
        ? "A IA está sobrecarregada no momento. Tente de novo em alguns segundos."
        : "Não consegui falar com a IA agora. Tente de novo.",
    };
  }
}
