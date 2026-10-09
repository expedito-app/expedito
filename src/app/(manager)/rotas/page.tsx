import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RouteReview } from "@/components/features/route-review";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, todayInSaoPaulo } from "@/lib/period";
import { loadDayRoutes } from "@/lib/routes";
import { TRANSPORT_LABEL } from "@/lib/transport";

export const metadata: Metadata = { title: "Rotas · Expedito" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function minutes(total: number): string {
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}

async function Routes({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).dia;
  const today = todayInSaoPaulo(new Date());
  const date = typeof raw === "string" && DATE.test(raw) ? raw : today;
  const tomorrow = addDays(today, 1);
  const day = await loadDayRoutes(date);
  const [y, m, d] = date.split("-");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Dia" className="flex flex-wrap items-center gap-1">
          {[
            { value: today, label: "Hoje" },
            { value: tomorrow, label: "Amanhã" },
          ].map((item) => (
            <Link
              key={item.value}
              href={item.value === today ? "/rotas" : `/rotas?dia=${item.value}`}
              aria-current={date === item.value ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ${
                date === item.value ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <form action="/rotas" className="ml-2 flex items-center gap-2">
            <label htmlFor="dia" className="sr-only">
              Outro dia
            </label>
            <input
              id="dia"
              type="date"
              name="dia"
              defaultValue={date}
              className="h-9 rounded-full border border-line bg-surface px-2 text-sm text-ink"
            />
            <button type="submit" className="h-9 rounded-full border border-line px-3 text-sm hover:bg-surface">
              Ver
            </button>
          </form>
        </nav>
      </div>
      <p className="mt-4 text-sm text-muted">
        {`${d}/${m}/${y}`} · ordem sugerida por prazo, horário da agência e distância entre as
        visitas, com a velocidade média de cada transporte (sem trânsito em tempo real).
        {date === today && " Inclui as atrasadas de dias anteriores."}
      </p>

      {day.base.point ? (
        <p className="mt-2 text-sm text-muted">
          Saída: {day.base.companyName} · {day.base.address}
        </p>
      ) : (
        <p className="mt-6 rounded-2xl bg-pastel-amber px-4 py-3 text-sm text-ink">
          <span aria-hidden>◷ </span>
          Cadastre o endereço da empresa em{" "}
          <Link href="/empresa" className="underline underline-offset-4">
            Empresa
          </Link>{" "}
          para as rotas saírem do lugar certo.
        </p>
      )}

      {/* Fora da linha das datas: as dicas da IA ocupam a largura toda. */}
      <div className="mt-6">
        <RouteReview date={date} />
      </div>

      {day.missingCoords.length > 0 && (
        <p className="mt-6 rounded-2xl bg-pastel-amber px-4 py-3 text-sm text-risk-at-risk">
          <span aria-hidden>◷ </span>
          Sem localização: {day.missingCoords.join(", ")}. Edite a agência em{" "}
          <Link href="/agencias" className="underline underline-offset-4">
            Agências
          </Link>{" "}
          (salvar com o endereço já localiza) para a distância entrar no cálculo.
        </p>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {day.members.map((member) => (
          <section key={member.id} aria-labelledby={`rota-${member.id}`} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`rota-${member.id}`} className="text-title font-medium">
                {member.name}
              </h2>
              <p className="text-sm text-muted">
                {TRANSPORT_LABEL[member.mode]}
                {member.plan.stops.length > 0 &&
                  ` · ${member.plan.totalKm.toFixed(1).replace(".", ",")} km · ${minutes(member.plan.totalMin)}`}
              </p>
            </div>
            {member.plan.lateCount > 0 && (
              <p className="mt-2 text-sm text-risk-overdue">
                <span aria-hidden>! </span>
                {member.plan.lateCount}{" "}
                {member.plan.lateCount === 1 ? "visita não cabe no prazo" : "visitas não cabem no prazo"}
              </p>
            )}
            {member.plan.stops.length ? (
              <ol className="mt-4 flex flex-col">
                {member.plan.stops.map((stop) => (
                  <li key={stop.taskId} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-line/70 py-3 last:border-0">
                    <span className="flex size-8 items-center justify-center rounded-full bg-canvas text-sm tabular-nums">{stop.order}</span>
                    <div className="min-w-0">
                      <Link
                        href={`/tarefas/${stop.taskId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {stop.agencyName}
                      </Link>
                      <p className="truncate text-sm text-muted">
                        {stop.documentRef} · prazo {member.labels[stop.taskId]?.due}
                        {stop.order > 1 &&
                          ` · ${stop.point ? `${stop.km.toFixed(1).replace(".", ",")} km` : "distância desconhecida"}, ${stop.travelMin} min`}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums">{member.labels[stop.taskId]?.eta}</p>
                      {stop.late && <p className="text-risk-overdue">atrasa</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-muted">Sem visitas abertas nesse dia.</p>
            )}
          </section>
        ))}
      </div>

      {day.unassigned.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-title font-medium">Sem responsável</h2>
          <p className="mt-1 text-sm text-muted">
            Abra a tarefa: o formulário mostra quem a roteirização sugere.
          </p>
          <ul className="mt-4 divide-y divide-line/70">
            {day.unassigned.map((t) => (
              <li key={t.id} className="flex justify-between gap-4 py-2 text-sm">
                <Link href={`/tarefas/${t.id}`} className="font-medium underline-offset-4 hover:underline">
                  {t.documentRef}
                </Link>
                <span className="text-muted">
                  {t.agencyName} · prazo {t.due}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function RotasPage({ searchParams }: PageProps<"/rotas">) {
  return (
    <>
      <PageHeader eyebrow="Roteirização" title="Rotas do dia" />
      <div className="mt-10">
        <Suspense fallback={<PageFallback />}>
          <Routes searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
