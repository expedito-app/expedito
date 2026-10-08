import "server-only";
import { GoogleGenAI } from "@google/genai";

// Modelo rápido e barato; trocável por GEMINI_MODEL sem mexer no código.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

let client: GoogleGenAI | null = null;

/** Cliente do Gemini (somente servidor), ou null se a chave não estiver configurada. */
export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

// 429 (limite) e 503 (alta demanda) costumam passar em segundos.
export function isTransient(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) return false;
  return error.status === 429 || error.status === 503;
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (const delayMs of [800, 2000]) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return fn();
}
