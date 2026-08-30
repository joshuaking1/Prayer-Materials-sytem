"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function closeDayAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notes = String(formData.get("notes") ?? "").trim();
  const exceptionReason = String(
    formData.get("exception_reason") ?? ""
  ).trim();

  const { error } = await supabase.rpc("close_daily_session", {
    p_notes: notes || null,
    p_exception_reason: exceptionReason || null,
  });

  if (error) {
    throw new Error(`Daily closing failed: ${error.message}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/closing");
  revalidatePath("/app/reports");
}
