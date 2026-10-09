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
