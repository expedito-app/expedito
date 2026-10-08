import "server-only";
import { GoogleGenAI } from "@google/genai";

// Modelo rápido e barato; trocável por GEMINI_MODEL sem mexer no código.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

let client: GoogleGenAI | null = null;

/** Cliente do Gemini (somente servidor), ou null se a chave não estiver configurada. */
export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
