import "server-only";

// Localiza o endereço da agência (latitude/longitude) pelo OpenStreetMap
// (Nominatim), uma vez, ao salvar a agência. Gratuito e sem chave; uso baixo e
// com identificação, como pede a política do serviço. Se falhar, a agência é
// salva sem coordenadas e o gestor pode digitá-las.

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 4000;

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = /\bbrasil\b|\bbrazil\b/i.test(address) ? address : `${address}, Brasil`;
  const url = `${ENDPOINT}?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
  })}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Expedito/1.0 (https://expedito-two.vercel.app)",
        "Accept-Language": "pt-BR",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const results: unknown = await response.json();
    if (!Array.isArray(results) || !results.length) return null;
    const first: unknown = results[0];
    if (typeof first !== "object" || first === null || !("lat" in first) || !("lon" in first)) {
      return null;
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
