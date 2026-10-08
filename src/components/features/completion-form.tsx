"use client";

import { useState, useTransition, type FormEvent } from "react";
import { completeTaskWithSignature } from "@/actions/field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SignaturePad } from "@/components/ui/signature-pad";
import type { FormState } from "@/lib/validation/form-state";

type CompletionFormProps = {
  taskId: string;
  onDone: () => void;
  onCancel: () => void;
};

// Concluir exige o nome de quem recebeu e a assinatura desenhada na tela.
export function CompletionForm({ taskId, onDone, onCancel }: CompletionFormProps) {
  const [signerName, setSignerName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!image || !signerName.trim()) return;
    startTransition(async () => {
      const result = await completeTaskWithSignature({ taskId, signerName, image });
      if (result.success) onDone();
      else setState(result);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {state.error && (
        <p role="alert" className="text-sm text-risk-overdue">
          {state.error}
        </p>
      )}
      <Field
        label="Quem recebeu"
        name="signerName"
        autoComplete="off"
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        errors={state.fieldErrors?.signerName}
        hint="Nome do atendente da agência."
      />
      <div>
        <p id="signature-label" className="text-label font-medium uppercase text-muted">
          Assinatura
        </p>
        <div className="mt-1.5">
          <SignaturePad onChange={setImage} labelledBy="signature-label" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="h-12">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || !image || !signerName.trim()}
          className="h-12"
        >
          {pending ? "Concluindo…" : "Concluir"}
        </Button>
      </div>
    </form>
  );
}
