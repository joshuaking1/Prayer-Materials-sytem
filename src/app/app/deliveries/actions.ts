"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type DeliveryState = {
  success: boolean;
  error?: string;
  deliveryId?: string;
};

type DeliveryItem = {
  product_id: string;
  boxes: number;
  loose_units: number;
};

export async function recordDeliveryAction(
  _previousState: DeliveryState,
  formData: FormData
): Promise<DeliveryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim();
  const invoiceDate = String(formData.get("invoice_date") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rawItems = String(formData.get("items") ?? "");
  const idempotencyKey = String(formData.get("idempotency_key") ?? "");

  if (!invoiceNumber) {
    return { success: false, error: "Enter the invoice number." };
  }

  if (!invoiceDate) {
    return { success: false, error: "Choose the invoice date." };
  }

  if (!idempotencyKey) {
    return {
      success: false,
      error: "The delivery transaction ID is missing. Refresh and try again.",
    };
  }

  let items: DeliveryItem[];

  try {
    const parsed = JSON.parse(rawItems);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid items");
    }

    items = parsed.map((item) => ({
      product_id: String(item.product_id),
      boxes: Number(item.boxes),
      loose_units: Number(item.loose_units),
    }));
  } catch {
    return {
      success: false,
      error: "The received materials could not be read.",
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      error: "Add at least one material from the invoice.",
    };
  }

  for (const item of items) {
    if (!item.product_id) {
      return { success: false, error: "One material is missing its ID." };
    }

    if (
      !Number.isInteger(item.boxes) ||
      !Number.isInteger(item.loose_units) ||
      item.boxes < 0 ||
      item.loose_units < 0 ||
      item.boxes + item.loose_units <= 0
    ) {
      return {
        success: false,
        error: "Each material needs boxes or loose units received.",
      };
    }
  }

  const { data, error } = await supabase.rpc("record_delivery", {
    p_invoice_number: invoiceNumber,
    p_invoice_date: invoiceDate,
    p_supplier: supplier || null,
    p_items: items,
    p_notes: notes || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error("RECORD DELIVERY ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    if (error.message.includes("NO_OPEN_DAILY_SESSION")) {
      return {
        success: false,
        error:
          "Today's operations aren't open. Open the day before receiving materials.",
      };
    }

    if (error.message.includes("NO_LOCATION_ASSIGNED")) {
      return {
        success: false,
        error: "Your account is not assigned to a location.",
      };
    }

    if (error.message.includes("INVALID_PRODUCT")) {
      return {
        success: false,
        error: "One of these materials is no longer active.",
      };
    }

    if (error.message.includes("PACKAGING_NOT_FOUND")) {
      return {
        success: false,
        error:
          "One of these materials does not have an active units-per-box setting.",
      };
    }

    return {
      success: false,
      error: `The delivery couldn't be recorded: ${error.message}`,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/deliveries");
  revalidatePath("/app/inventory");

  return {
    success: true,
    deliveryId: String(data),
  };
}
