"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";
import { NEEDS_COMPANY_KEY } from "@/lib/password-change";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_FIELDS,
  DEMURRAGE_FIELDS,
  companySchema,
  demurrageSchema,
} from "@/lib/validation/company";
import { fromZodError, readForm, type FormState } from "@/lib/validation/form-state";

/**
 * Empresa e endereço-base do gestor (de onde a equipe sai para as visitas).
 * profiles não tem política de UPDATE: o admin grava, preso ao id do gestor
 * logado. No primeiro acesso, também libera a marca needs_company do token.
 */
export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return { error: "Apenas gestores cadastram a empresa." };

  const values = readForm(formData, COMPANY_FIELDS);
  const parsed = companySchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  let { baseLatitude, baseLongitude } = parsed.data;
  const addressChanged = parsed.data.baseAddress !== manager.base_address;
  const coordsUnchanged =
    baseLatitude === manager.base_latitude && baseLongitude === manager.base_longitude;
  if (baseLatitude === null || (addressChanged && coordsUnchanged)) {
    const found = await geocodeAddress(parsed.data.baseAddress);
    if (!found) {
      return {
        error:
          "Não encontramos esse endereço no mapa. Confira rua, número e cidade, ou informe latitude e longitude.",
        fieldErrors: { baseAddress: ["Endereço não localizado."] },
        values,
      };
    }
    baseLatitude = found.latitude;
    baseLongitude = found.longitude;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      company_name: parsed.data.companyName,
      base_address: parsed.data.baseAddress,
      base_latitude: baseLatitude,
      base_longitude: baseLongitude,
    })
    .eq("id", manager.id)
    .eq("role", "manager")
    .select("id");
  if (error || !data.length) return { error: "Não foi possível salvar a empresa.", values };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims.app_metadata?.[NEEDS_COMPANY_KEY] === true) {
    const { error: flagError } = await admin.auth.admin.updateUserById(manager.id, {
      app_metadata: { [NEEDS_COMPANY_KEY]: false },
    });
    if (flagError) return { error: "Empresa salva, mas não foi possível liberar o acesso." };
    // Token novo, já sem a marca (o proxy lê o token).
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      await supabase.auth.signOut();
      redirect("/login");
    }
    redirect("/painel");
  }

  refresh();
  return { success: "Empresa atualizada. As rotas passam a sair deste endereço." };
}

/** Premissas do cálculo de demurrage evitado (Indicadores e painel). */
export async function saveDemurrageSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return { error: "Apenas gestores alteram as premissas." };

  const values = readForm(formData, DEMURRAGE_FIELDS);
  const parsed = demurrageSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({
      demurrage_daily_brl: parsed.data.dailyBrl,
      containers_per_bl: parsed.data.containersPerBl,
      demurrage_days_per_delay: parsed.data.daysPerDelay,
      baseline_late_rate: parsed.data.baselinePercent / 100,
    })
    .eq("id", manager.id)
    .eq("role", "manager")
    .select("id");
  if (error || !data.length) return { error: "Não foi possível salvar as premissas.", values };

  refresh();
  return { success: "Premissas salvas. Painel e Indicadores já usam os novos valores." };
}
