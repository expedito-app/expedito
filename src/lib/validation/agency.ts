import { z } from "zod";
import { optionalText } from "./form-state";

const optionalTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), {
    error: "Use o formato HH:MM.",
  })
  .transform((v) => v || null);

export const AGENCY_FIELDS = [
  "name",
  "address",
  "opensAt",
  "closesAt",
  "requirements",
  "notes",
] as const;

export const agencySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Informe o nome da agência." })
      .max(120, { error: "Nome muito longo." }),
    address: optionalText(240, "Endereço muito longo."),
    opensAt: optionalTime,
    closesAt: optionalTime,
    requirements: optionalText(1000, "Texto muito longo."),
    notes: optionalText(1000, "Texto muito longo."),
  })
  .refine(
    (a) => !a.opensAt || !a.closesAt || a.opensAt < a.closesAt,
    { error: "O fechamento deve ser depois da abertura.", path: ["closesAt"] },
  );
