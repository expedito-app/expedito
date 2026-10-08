"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";
import { AGENCY_FIELDS, agencySchema } from "@/lib/validation/agency";
import {
  fromZodError,
  readForm,
  uuidSchema,
  type FormState,
} from "@/lib/validation/form-state";

const NOT_MANAGER: FormState = {
  error: "Apenas gestores podem gerenciar agências.",
};

type AgencyInput = ReturnType<typeof agencySchema.parse>;

function toRow(data: AgencyInput) {
  return {
    name: data.name,
    address: data.address,
    opens_at: data.opensAt,
    closes_at: data.closesAt,
    requirements: data.requirements,
    notes: data.notes,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

/** Sem coordenadas digitadas: tenta localizar pelo endereço (para a roteirização). */
async function withCoordinates(data: AgencyInput): Promise<AgencyInput> {
  if (data.latitude !== null || !data.address) return data;
  const found = await geocodeAddress(data.address);
  return found ? { ...data, ...found } : data;
}

export async function createAgency(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return NOT_MANAGER;

  const values = readForm(formData, AGENCY_FIELDS);
  const parsed = agencySchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agencies")
    .insert({ ...toRow(await withCoordinates(parsed.data)), manager_id: manager.id });
  if (error) return { error: "Não foi possível salvar a agência.", values };

  redirect("/agencias");
}

export async function updateAgency(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return NOT_MANAGER;
  if (!uuidSchema.safeParse(id).success) return { error: "Agência inválida." };

  const values = readForm(formData, AGENCY_FIELDS);
  const parsed = agencySchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  // O RLS garante que só a agência do próprio gestor é alterada.
  const supabase = await createClient();

  // Endereço mudou e as coordenadas ficaram as antigas: localiza de novo.
  let input = parsed.data;
  const { data: current } = await supabase
    .from("agencies")
    .select("address, latitude, longitude")
    .eq("id", id)
    .maybeSingle();
  if (
    current &&
    current.address !== input.address &&
    current.latitude === input.latitude &&
    current.longitude === input.longitude
  ) {
    input = { ...input, latitude: null, longitude: null };
  }

  const { data, error } = await supabase
    .from("agencies")
    .update(toRow(await withCoordinates(input)))
    .eq("id", id)
    .select("id");
  if (error || !data.length) {
    return { error: "Não foi possível salvar a agência.", values };
  }

  redirect("/agencias");
}

export async function deleteAgency(id: string): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return NOT_MANAGER;
  if (!uuidSchema.safeParse(id).success) return { error: "Agência inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .delete()
    .eq("id", id)
    .select("id");

  // 23503: a agência ainda tem tarefas (FK on delete restrict).
  if (error?.code === "23503") {
    return {
      error:
        "Esta agência tem tarefas vinculadas. Exclua ou mova as tarefas antes.",
    };
  }
  if (error || !data.length) {
    return { error: "Não foi possível excluir a agência." };
  }

  redirect("/agencias");
}
