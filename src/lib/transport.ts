import type { Enums } from "@/types/database";

export type TransportMode = Enums<"transport_mode">;

export const TRANSPORT_MODES = ["transit", "motorcycle", "car"] as const satisfies readonly TransportMode[];

export const TRANSPORT_LABEL: Record<TransportMode, string> = {
  transit: "Ônibus / a pé",
  motorcycle: "Moto",
  car: "Carro",
};

// Estimativas para o centro de Santos, sem trânsito em tempo real (fora do
// escopo): velocidade média porta a porta e tempo extra por parada
// (estacionar, caminhar até o balcão).
export const TRANSPORT_PROFILE: Record<TransportMode, { kmh: number; stopOverheadMin: number }> = {
  transit: { kmh: 14, stopOverheadMin: 5 },
  motorcycle: { kmh: 28, stopOverheadMin: 3 },
  car: { kmh: 22, stopOverheadMin: 10 },
};
