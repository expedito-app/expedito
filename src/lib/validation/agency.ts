import { z } from "zod";
import { optionalText } from "./form-state";

const optionalTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), {
    error: "Use o formato HH:MM.",
  })
  .transform((v) => v || null);

// Coordenada opcional: aceita vírgula decimal ("-23,9608").
const optionalCoord = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
      error: "Coordenada inválida.",
    });

export const AGENCY_FIELDS = [
  "name",
  "address",
  "opensAt",
  "closesAt",
  "requirements",
  "notes",
  "latitude",
  "longitude",
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
    latitude: optionalCoord(-90, 90),
    longitude: optionalCoord(-180, 180),
  })
  .refine(
    (a) => !a.opensAt || !a.closesAt || a.opensAt < a.closesAt,
    { error: "O fechamento deve ser depois da abertura.", path: ["closesAt"] },
  )
  .refine((a) => (a.latitude === null) === (a.longitude === null), {
    error: "Informe latitude e longitude, ou deixe as duas em branco.",
    path: ["longitude"],
  });
