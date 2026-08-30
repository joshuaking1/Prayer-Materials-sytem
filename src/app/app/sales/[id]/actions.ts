"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CancellationState = {
  success: boolean;
  error?: string;
};

export async function requestSaleCancellationAction(
  _previousState: CancellationState,
  formData: FormData
): Promise<CancellationState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const saleId = String(formData.get("sale_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!saleId) {
    return {
      success: false,
      error: "The sale ID is missing.",
    };
  }

  if (reason.length < 3) {
    return {
      success: false,
      error: "Enter a short reason for the cancellation request.",
    };
  }

  const { error } = await supabase.rpc("request_sale_cancellation", {
    p_sale_id: saleId,
    p_reason: reason,
  });

  if (error) {
    console.error("SALE CANCELLATION REQUEST ERROR", error);

    if (error.message.includes("SALE_NOT_FOUND")) {
      return {
        success: false,
        error: "This sale could not be found.",
      };
    }

    if (error.message.includes("ALREADY_REQUESTED")) {
      return {
        success: false,
        error: "A cancellation request already exists for this sale.",
      };
    }

    return {
      success: false,
      error: `The request could not be submitted: ${error.message}`,
    };
  }

  revalidatePath("/app/sales");
  revalidatePath(`/app/sales/${saleId}`);
  revalidatePath("/app/approvals");

  return {
    success: true,
  };
}
