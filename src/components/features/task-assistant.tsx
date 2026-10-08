"use client";

import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { askAssistant, type AssistantReply } from "@/actions/assistant";
import { createTaskFromDraft } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { MAX_MESSAGE_LENGTH, type AssistantMessage } from "@/lib/validation/assistant";

const EASE = [0.22, 1, 0.36, 1] as const;

type DraftReply = Extract<AssistantReply, { kind: "draft" }>;

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "model"; reply: Exclude<AssistantReply, DraftReply> }
  | {
      id: number;
      role: "model";
      reply: DraftReply;
      state: "open" | "saving" | "created" | "discarded";
      taskId?: string;
      error?: string;
    };

const EXAMPLE = "Retirar o BL MSCU1234567 na Maersk amanhã até 15h, urgente, Bruno";

// O que o Gemini precisa saber de cada turno anterior (o servidor não guarda conversa).
function toHistory(messages: Message[]): AssistantMessage[] {
  return messages.flatMap((m): AssistantMessage[] => {
    if (m.role === "user") return [{ role: "user", text: m.text }];
    if (m.reply.kind === "error") return [];
    if (m.reply.kind === "text") return [{ role: "model", text: m.reply.text }];
    const s = m.reply.summary;
    const outcome =
      "state" in m && m.state === "created"
        ? "O gestor criou a tarefa."
        : "state" in m && m.state === "discarded"
          ? "O gestor descartou o rascunho."
          : "Aguardando confirmação do gestor.";
    return [
      {
        role: "model",
        text: `Rascunho: ${s.documentRef}, ${s.agency}, prazo ${s.due}, urgência ${s.urgency}, ${s.member}. ${outcome}`,
      },
    ];
  });
}

function DraftCard({
  message,
  onCreate,
  onDiscard,
}: {
  message: Extract<Message, { state: string }>;
  onCreate: () => void;
  onDiscard: () => void;
}) {
  const s = message.reply.summary;
  const rows: [string, string][] = [
    ["Documento", s.documentRef],
    ["Agência", s.agency],
    ["Prazo", s.due],
    ["Urgência", s.urgency],
    ["Responsável", s.member],
  ];
  if (s.description) rows.push(["Descrição", s.description]);

  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-label font-medium uppercase text-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {message.error && (
        <p role="alert" className="mt-3 text-sm text-risk-overdue">
          {message.error}
        </p>
      )}
      <div className="mt-4">
        {message.state === "created" ? (
          <p className="text-sm text-muted">
            Tarefa criada.{" "}
            <Link
              href={`/tarefas/${message.taskId}`}
              className="font-medium text-ink underline underline-offset-4"
            >
              Abrir
            </Link>
          </p>
        ) : message.state === "discarded" ? (
          <p className="text-sm text-muted">Rascunho descartado.</p>
        ) : (
          <div className="flex gap-3">
            <Button onClick={onCreate} disabled={message.state === "saving"}>
              {message.state === "saving" ? "Criando…" : "Criar"}
            </Button>
            <Button
              variant="ghost"
              onClick={onDiscard}
              disabled={message.state === "saving"}
            >
              Descartar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, startAsking] = useTransition();
  const nextId = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, asking]);

  function updateDraft(id: number, patch: Partial<Extract<Message, { state: string }>>) {
    setMessages((list) =>
      list.map((m) => (m.id === id && "state" in m ? { ...m, ...patch } : m)),
    );
  }

  function send(e: { preventDefault(): void }) {
    e.preventDefault();
    const text = input.trim();
    if (!text || asking) return;
    const userMessage: Message = { id: nextId.current++, role: "user", text };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    startAsking(async () => {
      const reply = await askAssistant(toHistory(next));
      const id = nextId.current++;
      setMessages((list) => [
        ...list,
        reply.kind === "draft"
          ? { id, role: "model", reply, state: "open" }
          : { id, role: "model", reply },
      ]);
    });
  }

  async function create(message: Extract<Message, { state: string }>) {
    updateDraft(message.id, { state: "saving", error: undefined });
    const result = await createTaskFromDraft(message.reply.draft);
    if (result.id) {
      updateDraft(message.id, { state: "created", taskId: result.id });
      router.refresh();
      return;
    }
    const fieldError = Object.values(result.fieldErrors ?? {}).find(Boolean)?.[0];
    updateDraft(message.id, {
      state: "open",
      error: fieldError ?? result.error ?? "Não foi possível criar a tarefa.",
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="task-assistant"
      >
        Assistente
      </Button>
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-40 flex justify-end">
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-ink/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                id="task-assistant"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-assistant-title"
                className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-paper"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
                  <div>
                    <p className="text-label font-medium uppercase text-muted">IA</p>
                    <h2
                      id="task-assistant-title"
                      className="font-serif text-title font-semibold"
                    >
                      Assistente de tarefas
                    </h2>
                  </div>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Fechar
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6" aria-live="polite">
                  {messages.length === 0 && (
                    <div className="text-sm text-muted">
                      <p>Descreva a tarefa como falaria com a equipe. Por exemplo:</p>
                      <button
                        type="button"
                        onClick={() => {
                          setInput(EXAMPLE);
                          inputRef.current?.focus();
                        }}
                        className="mt-3 rounded-md border border-line px-3 py-2 text-left text-ink transition-colors duration-150 hover:bg-surface"
                      >
                        “{EXAMPLE}”
                      </button>
                      <p className="mt-4">Nada é gravado sem você clicar em “Criar”.</p>
                    </div>
                  )}
                  <ul className="flex flex-col gap-4">
                    {messages.map((m) => (
                      <motion.li
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className={m.role === "user" ? "ml-10 self-end" : "mr-6"}
                      >
                        {m.role === "user" ? (
                          <p className="rounded-md bg-surface px-3 py-2 text-sm text-ink">
                            {m.text}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <p
                              role={m.reply.kind === "error" ? "alert" : undefined}
                              className={`text-sm ${
                                m.reply.kind === "error" ? "text-risk-overdue" : "text-ink"
                              }`}
                            >
                              {m.reply.text}
                            </p>
                            {"state" in m && (
                              <DraftCard
                                message={m}
                                onCreate={() => create(m)}
                                onDiscard={() => updateDraft(m.id, { state: "discarded" })}
                              />
                            )}
                          </div>
                        )}
                      </motion.li>
                    ))}
                    {asking && (
                      <li className="text-sm text-muted">Pensando…</li>
                    )}
                  </ul>
                  <div ref={endRef} />
                </div>

                <form
                  onSubmit={send}
                  className="flex flex-col gap-3 border-t border-line px-6 py-4"
                >
                  <label htmlFor="assistant-input" className="sr-only">
                    Mensagem para o assistente
                  </label>
                  <textarea
                    id="assistant-input"
                    ref={inputRef}
                    rows={2}
                    value={input}
                    maxLength={MAX_MESSAGE_LENGTH}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        send(e);
                      }
                    }}
                    placeholder="Ex.: entregar o BL na Hapag sexta até 11h"
                    className="rounded-md border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">Enter envia · Shift+Enter quebra linha</p>
                    <Button type="submit" disabled={asking || !input.trim()}>
                      Enviar
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </>
  );
}
