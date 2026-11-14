"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/dal";
import { eventInput, localDate } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export type EventState = { error?: string; success?: string };

export async function createEvent(_: EventState, formData: FormData): Promise<EventState> {
  const profile = await requireRole(["admin"]);
  const input = eventInput(formData);
  if ("error" in input) return input;
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({ ...input.value, created_by: profile.id });
  if (error) return { error: "Event belum dapat dibuat. Periksa isian lalu coba lagi." };
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/tulis");
  return { success: "Event berhasil dibuat." };
}

export async function joinEvent(eventId: string) {
  const profile = await requireUser();
  if (!/^[a-f0-9-]{36}$/i.test(eventId)) return;
  const supabase = await createClient();
  const today = localDate();
  const { data: event, error: eventError } = await supabase.from("events").select("id").eq("id", eventId).lte("starts_on", today).gte("ends_on", today).maybeSingle();
  if (eventError || !event) return;
  const { error } = await supabase.from("event_participants").upsert({ event_id: eventId, user_id: profile.id }, { onConflict: "event_id,user_id", ignoreDuplicates: true });
  if (error) return;
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/tulis");
}
