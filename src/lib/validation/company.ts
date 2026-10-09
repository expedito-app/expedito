import { z } from "zod";

const optionalCoord = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), {
      error: "Coordenada inválida.",
    });

export const COMPANY_FIELDS = ["companyName", "baseAddress", "baseLatitude", "baseLongitude"] as const;

export const companySchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, { error: "Informe o nome da empresa." })
      .max(120, { error: "Nome muito longo." }),
    baseAddress: z
      .string()
      .trim()
      .min(5, { error: "Informe o endereço completo (rua, número, bairro, cidade)." })
      .max(240, { error: "Endereço muito longo." }),
    baseLatitude: optionalCoord(-90, 90),
    baseLongitude: optionalCoord(-180, 180),
  })
  .refine((c) => (c.baseLatitude === null) === (c.baseLongitude === null), {
    error: "Informe latitude e longitude, ou deixe as duas em branco.",
    path: ["baseLongitude"],
  });

const decimal = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    // "1.500,50" ou "1500.5": com vírgula, ponto é milhar; sem vírgula, ponto é decimal.
    .transform((v) => Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v))
    .refine((v) => Number.isFinite(v) && v >= min && v <= max, { error: message });

export const DEMURRAGE_FIELDS = ["dailyBrl", "containersPerBl", "daysPerDelay", "baselinePercent"] as const;

export const demurrageSchema = z.object({
  dailyBrl: decimal(1, 100000, "Informe a diária em reais (ex.: 500)."),
  containersPerBl: decimal(0.5, 50, "Entre 0,5 e 50."),
  daysPerDelay: decimal(0.5, 30, "Entre 0,5 e 30 dias."),
  baselinePercent: decimal(0, 95, "Entre 0% e 95%."),
});
