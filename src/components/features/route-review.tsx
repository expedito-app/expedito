"use client";

import { useState, useTransition } from "react";
import { reviewRoutesWithAi } from "@/actions/routing";
import { Button } from "@/components/ui/button";

export function RouteReview({ date }: { date: string }) {
  const [tips, setTips] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const reply = await reviewRoutesWithAi(date);
            if (reply.ok) setTips(reply.tips);
            else setError(reply.error);
          })
        }
      >
        {pending ? "Revisando…" : "Revisar rotas com IA"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-risk-overdue">
          {error}
        </p>
      )}
      {tips && (
        <ul aria-live="polite" className="mt-4 flex flex-col gap-2 border-l-2 border-accent pl-4 text-sm">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
