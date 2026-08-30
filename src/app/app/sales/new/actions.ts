"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SaleState = {
  success: boolean;
  error?: string;
  saleId?: string;
};

type SaleItem = {
  product_id: string;
  quantity: number;
};

export async function recordSaleAction(
  _previousState: SaleState,
  formData: FormData
): Promise<SaleState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawItems = String(formData.get("items") ?? "");
  const paymentMethod = String(
    formData.get("payment_method") ?? ""
  );

  const paymentReference = String(
    formData.get("payment_reference") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  const idempotencyKey = String(
    formData.get("idempotency_key") ?? ""
  );

  let items: SaleItem[];

  try {
    const parsed = JSON.parse(rawItems);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid items");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),
      quantity: Number(item.quantity),
    }));
  } catch {
    return {
      success: false,
      error: "The sale information could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "Add at least one material to the sale.",
    };
  }

  for (const item of items) {
    if (
      !item.product_id ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      return {
        success: false,
        error: "One of the sale quantities is invalid.",
      };
    }
  }

  if (!paymentMethod) {
    return {
      success: false,
      error: "Choose how the customer paid.",
    };
  }

  if (!idempotencyKey) {
    return {
      success: false,
      error: "The transaction ID is missing. Refresh and try again.",
    };
  }

  const { data, error } = await supabase.rpc(
    "record_sale",
    {
      p_items: items,
      p_payment_method: paymentMethod,
      p_discount: 0,
      p_payment_reference:
        paymentReference || null,
      p_notes: notes || null,
      p_idempotency_key: idempotencyKey,
    }
  );

  if (error) {
    console.error("RECORD SALE ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (
      error.message.includes(
        "NO_OPEN_DAILY_SESSION"
      )
    ) {
      return {
        success: false,
        error:
          "Today's operations aren't open. Open the day before recording sales.",
      };
    }

    if (
      error.message.includes(
        "INSUFFICIENT_STOCK"
      )
    ) {
      return {
        success: false,
        error:
          "There isn't enough stock to complete this sale. Refresh the page and check the quantities.",
      };
    }

    if (
      error.message.includes("PRICE_NOT_FOUND")
    ) {
      return {
        success: false,
        error:
          "One of these materials doesn't have an active selling price.",
      };
    }

    if (
      error.message.includes("INVALID_QUANTITY")
    ) {
      return {
        success: false,
        error:
          "One of the quantities is invalid.",
      };
    }

    return {
      success: false,
      error: `The sale couldn't be completed: ${error.message}`,
    };
  }

  const saleId = String(data);

  revalidatePath("/app");
  revalidatePath("/app/sales");
  revalidatePath("/app/inventory");

  return {
    success: true,
    saleId,
  };
}
