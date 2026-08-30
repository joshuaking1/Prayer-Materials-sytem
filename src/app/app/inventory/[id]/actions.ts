"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type InventoryCorrectionState = {
  success: boolean;
  error?: string;
};

export async function correctInventoryAction(
  _previousState: InventoryCorrectionState,
  formData: FormData
): Promise<InventoryCorrectionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const productId = String(formData.get("product_id") ?? "");
  const correctQuantity = Number(formData.get("correct_quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!productId) {
    return {
      success: false,
      error: "Product is missing.",
    };
  }

  if (!Number.isInteger(correctQuantity) || correctQuantity < 0) {
    return {
      success: false,
      error: "Enter a valid total quantity.",
    };
  }

  if (reason.length < 5) {
    return {
      success: false,
      error: "Enter a short reason for the correction.",
    };
  }

  const { error } = await supabase.rpc("correct_inventory_quantity", {
    p_product_id: productId,
    p_correct_quantity: correctQuantity,
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("NOT_AUTHORIZED")) {
      return {
        success: false,
        error: "Only supervisors and administrators can correct inventory.",
      };
    }

    if (error.message.includes("NO_OPEN_DAILY_SESSION")) {
      return {
        success: false,
        error: "Open today's operations before correcting inventory.",
      };
    }

    return {
      success: false,
      error: `The inventory correction could not be saved: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/inventory");
  revalidatePath(`/app/inventory/${productId}`);
  revalidatePath("/app/reports");

  return {
    success: true,
  };
}
