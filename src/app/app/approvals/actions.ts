"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function approveSaleCancellationAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const approvalId = String(formData.get("approval_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!approvalId) {
    throw new Error("Approval ID is missing.");
  }

  const { error } = await supabase.rpc("approve_sale_cancellation", {
    p_approval_id: approvalId,
    p_notes: notes || null,
  });

  if (error) {
    throw new Error(`Approval failed: ${error.message}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/approvals");
  revalidatePath("/app/sales");
  revalidatePath("/app/inventory");
}
